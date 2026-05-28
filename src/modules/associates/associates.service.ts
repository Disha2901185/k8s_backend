import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DealStage, LeadSourceType, Prisma } from '@prisma/client';
import {
  CreateAssociateDto,
  ListAssociatesQueryDto,
  UpdateAssociateDto,
} from 'src/modules/associates/associates.dto';
import { AssociatesRepository } from 'src/modules/associates/associates.repository';

type AssociateWithRelations = Prisma.AssociateGetPayload<{
  include: {
    deals: {
      include: {
        company: true;
        sourceLead: true;
      };
    };
  };
}>;

type AssociateInteraction = {
  id: string;
  type: string;
  channel: string;
  label: string;
  at: Date;
  summary: string;
  subject: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
};

@Injectable()
export class AssociatesService {
  constructor(private readonly associatesRepository: AssociatesRepository) {}

  async listAssociates(tenantId: string, query: ListAssociatesQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const search = this.clean(query.search);

    const where: Prisma.AssociateWhereInput = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.associatesRepository.listAssociates(where, (page - 1) * limit, limit),
      this.associatesRepository.countAssociates(where),
    ]);

    return {
      items: items.map((item) => this.mapAssociateListItem(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getAssociate(tenantId: string, id: string) {
    const associate = await this.requireAssociate(tenantId, id);

    return {
      id: associate.id,
      name: associate.name,
      email: associate.email,
      phone: associate.phone,
      createdAt: associate.createdAt,
      updatedAt: associate.updatedAt,
      summary: this.buildSummary(associate),
    };
  }

  async createAssociate(tenantId: string, dto: CreateAssociateDto) {
    const name = this.clean(dto.name);
    if (!name) {
      throw new BadRequestException('Associate name is required');
    }

    const normalizedName = this.normalizeName(name);
    const existing = await this.associatesRepository.findAssociateByNormalizedName(
      tenantId,
      normalizedName,
    );

    if (existing) {
      throw new BadRequestException('An associate with this name already exists');
    }

    const created = await this.associatesRepository.createAssociate({
      tenant: { connect: { id: tenantId } },
      name,
      normalizedName,
      email: this.clean(dto.email),
      phone: this.clean(dto.phone),
    });

    return {
      id: created.id,
      name: created.name,
      email: created.email,
      phone: created.phone,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      summary: this.buildSummary(created),
    };
  }

  async updateAssociate(tenantId: string, id: string, dto: UpdateAssociateDto) {
    const existing = await this.requireAssociate(tenantId, id);
    const nextName = this.clean(dto.name) ?? existing.name;
    const normalizedName = this.normalizeName(nextName);

    if (normalizedName !== existing.normalizedName) {
      const duplicate = await this.associatesRepository.findAssociateByNormalizedName(
        tenantId,
        normalizedName,
      );

      if (duplicate && duplicate.id !== existing.id) {
        throw new BadRequestException('An associate with this name already exists');
      }
    }

    const updated = await this.associatesRepository.updateAssociate(id, {
      name: nextName,
      normalizedName,
      email: dto.email === undefined ? existing.email : this.clean(dto.email) ?? null,
      phone: dto.phone === undefined ? existing.phone : this.clean(dto.phone) ?? null,
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      summary: this.buildSummary(updated),
    };
  }

  async deleteAssociate(tenantId: string, id: string) {
    await this.requireAssociate(tenantId, id);
    await this.associatesRepository.deleteAssociate(id);
    return { success: true };
  }

  async getAssociateSummary(tenantId: string, id: string) {
    const associate = await this.requireAssociate(tenantId, id);
    return this.buildSummary(associate);
  }

  async getAssociateDeals(tenantId: string, id: string) {
    const associate = await this.requireAssociate(tenantId, id);

    return {
      associateId: associate.id,
      items: associate.deals.map((deal) => ({
        id: deal.id,
        title: deal.title,
        companyName: deal.company?.name ?? null,
        currency: deal.currency,
        value: Number(deal.value),
        stage: deal.stage,
        stageLabel: this.stageLabel(deal.stage),
        status: this.isActiveDeal(deal.stage) ? 'active' : 'closed',
        createdAt: deal.createdAt,
        updatedAt: deal.updatedAt,
      })),
    };
  }

  async getAssociateInteractions(tenantId: string, id: string) {
    const associate = await this.requireAssociate(tenantId, id);
    const interactions = this.buildInteractions(associate);

    return {
      associateId: associate.id,
      items: interactions.map((interaction) => ({
        ...interaction,
        at: interaction.at,
      })),
    };
  }

  private async requireAssociate(tenantId: string, id: string) {
    const associate = await this.associatesRepository.findAssociateById(tenantId, id);
    if (!associate) {
      throw new NotFoundException('Associate not found');
    }

    return associate;
  }

  private mapAssociateListItem(associate: AssociateWithRelations) {
    const summary = this.buildSummary(associate);

    return {
      id: associate.id,
      name: associate.name,
      email: associate.email,
      phone: associate.phone,
      createdAt: associate.createdAt,
      updatedAt: associate.updatedAt,
      summary,
      performance: {
        activeDealsCount: summary.activeDealsCount,
        closedDealsCount: summary.closedDealsCount,
        revenueWon: summary.revenueWon,
        revenueCurrency: summary.revenueCurrency,
      },
      lastContactedAt: summary.lastContactedAt,
    };
  }

  private buildSummary(associate: AssociateWithRelations) {
    const activeDeals = associate.deals.filter((deal) => this.isActiveDeal(deal.stage));
    const closedDeals = associate.deals.filter((deal) => !this.isActiveDeal(deal.stage));
    const wonDeals = associate.deals.filter((deal) => deal.stage === DealStage.CLOSED_WON);
    const revenueWon = wonDeals.reduce((sum, deal) => sum + Number(deal.value), 0);
    const interactions = this.buildInteractions(associate);
    const lastContactedAt = this.getLastContactedAt(interactions);

    return {
      activeDealsCount: activeDeals.length,
      closedDealsCount: closedDeals.length,
      activePipelineDealsCount: activeDeals.length,
      revenueWon,
      revenueCurrency: wonDeals[0]?.currency ?? associate.deals[0]?.currency ?? 'INR',
      totalDealsCount: associate.deals.length,
      lastContactedAt,
    };
  }

  private buildInteractions(associate: AssociateWithRelations): AssociateInteraction[] {
    const interactions: AssociateInteraction[] = [];

    for (const deal of associate.deals) {
      if (deal.sourceLead) {
        interactions.push(this.mapLeadInteraction(deal, deal.sourceLead));
      }

      interactions.push({
        id: `deal-${deal.id}`,
        type: 'deal-update',
        channel: 'system',
        label: 'Deal linked',
        at: deal.updatedAt,
        summary: `${deal.title}${deal.company?.name ? ` for ${deal.company.name}` : ''}`,
        subject: deal.title,
        content: `Deal is currently in ${this.stageLabel(deal.stage)}.`,
        metadata: {
          dealId: deal.id,
          stage: deal.stage,
          value: Number(deal.value),
          currency: deal.currency,
          companyName: deal.company?.name ?? null,
        },
      });
    }

    interactions.push({
      id: `associate-created-${associate.id}`,
      type: 'associate-created',
      channel: 'system',
      label: 'Associate created',
      at: associate.createdAt,
      summary: `${associate.name} was added to the tenant workspace`,
      subject: null,
      content: null,
      metadata: null,
    });

    return interactions.sort(
      (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
    );
  }

  private mapLeadInteraction(
    deal: AssociateWithRelations['deals'][number],
    lead: NonNullable<AssociateWithRelations['deals'][number]['sourceLead']>,
  ): AssociateInteraction {
    const at = lead.capturedAt ?? lead.updatedAt ?? deal.updatedAt;

    const base = {
      id: `lead-${lead.id}`,
      at,
      metadata: {
        leadId: lead.id,
        dealId: deal.id,
        sourceType: lead.sourceType,
        stage: deal.stage,
        companyName: deal.company?.name ?? null,
      },
    };

    switch (lead.sourceType) {
      case LeadSourceType.EMAIL_INQUIRY:
        return {
          ...base,
          type: 'email',
          channel: 'email',
          label: 'Email',
          summary: lead.subject || `Email linked to ${deal.title}`,
          subject: lead.subject ?? deal.title,
          content: lead.messagePreview ?? 'Email inquiry captured for this associate.',
        };
      case LeadSourceType.WHATSAPP:
        return {
          ...base,
          type: 'whatsapp',
          channel: 'whatsapp',
          label: 'WhatsApp',
          summary: `WhatsApp linked to ${deal.title}`,
          subject: null,
          content: lead.messagePreview ?? 'WhatsApp inquiry captured for this associate.',
        };
      default:
        return {
          ...base,
          type: 'lead-intake',
          channel: 'system',
          label: this.sourceTypeLabel(lead.sourceType),
          summary: lead.subject || lead.companyName || `${this.sourceTypeLabel(lead.sourceType)} linked`,
          subject: lead.subject ?? null,
          content: lead.messagePreview ?? null,
        };
    }
  }

  private getLastContactedAt(interactions: AssociateInteraction[]) {
    const lastCommunication = interactions.find((interaction) =>
      ['email', 'whatsapp', 'lead-intake'].includes(interaction.type),
    );

    return lastCommunication?.at ?? null;
  }

  private isActiveDeal(stage: DealStage) {
    return stage !== DealStage.CLOSED_WON && stage !== DealStage.NOT_PROGRESSING;
  }

  private clean(value?: string | null) {
    const next = value?.trim();
    return next ? next : undefined;
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private stageLabel(stage: DealStage) {
    const labels: Record<DealStage, string> = {
      DISCOVERY: 'Discovery',
      PROPOSAL: 'Proposal',
      NEGOTIATION: 'Negotiation',
      NOT_PROGRESSING: 'Not Progressing',
      CLOSED_WON: 'Closed Won',
    };

    return labels[stage];
  }

  private sourceTypeLabel(sourceType: LeadSourceType) {
    const labels: Record<LeadSourceType, string> = {
      WEB_FORM: 'Web Form',
      AI_ASSISTANT: 'AI Assistant',
      WHATSAPP: 'WhatsApp',
      RESOURCE_DOWNLOAD: 'Resource Download',
      EVENT_REGISTRATION: 'Event Registration',
      EMAIL_INQUIRY: 'Email Inquiry',
      LINKEDIN: 'LinkedIn',
      CUSTOM: 'Custom',
    };

    return labels[sourceType];
  }
}

