import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateContactDto,
  ListContactsQueryDto,
  UpdateContactDto,
} from 'src/modules/contacts/contacts.dto';
import { ContactsRepository } from 'src/modules/contacts/contacts.repository';

@Injectable()
export class ContactsService {
  constructor(private readonly contactsRepository: ContactsRepository) {}

  async listContacts(tenantId: string, query: ListContactsQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const search = this.clean(query.search);
    const companyId = this.clean(query.companyId);
    const companyName = this.clean(query.companyName);

    const where: Prisma.ContactWhereInput = {
      tenantId,
      companyId: { not: null },
      ...(companyId ? { companyId } : {}),
      ...(companyName
        ? {
            company: {
              name: {
                contains: companyName,
                mode: 'insensitive',
              },
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              {
                company: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.contactsRepository.listContacts(where, (page - 1) * limit, limit),
      this.contactsRepository.countContacts(where),
    ]);

    return {
      items: items.map((item) => this.mapContact(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getContact(tenantId: string, id: string) {
    const contact = await this.requireContact(tenantId, id);
    return this.mapContact(contact, true);
  }

  async createContact(tenantId: string, dto: CreateContactDto) {
    const company = await this.resolveCompany(tenantId, dto.companyId, dto.companyName);
    const payload = await this.buildContactPayload(tenantId, company.id, dto);

    const created = await this.contactsRepository.createContact({
      tenant: { connect: { id: tenantId } },
      company: { connect: { id: company.id } },
      ...payload,
    });

    if (!company.primaryContactId) {
      await this.contactsRepository.updateCompany(company.id, {
        primaryContact: { connect: { id: created.id } },
      });
    }

    return this.mapContact(created, true);
  }

  async updateContact(tenantId: string, id: string, dto: UpdateContactDto) {
    const contact = await this.requireContact(tenantId, id);
    const company = await this.resolveCompany(
      tenantId,
      dto.companyId ?? contact.companyId ?? undefined,
      dto.companyName ?? contact.company?.name ?? undefined,
    );
    const payload = await this.buildContactPayload(tenantId, company.id, dto, contact.id);

    const updated = await this.contactsRepository.updateContact(contact.id, {
      company: { connect: { id: company.id } },
      ...payload,
    });

    return this.mapContact(updated, true);
  }

  async deleteContact(tenantId: string, id: string) {
    await this.requireContact(tenantId, id);
    await this.contactsRepository.deleteContact(id);
    return { success: true };
  }

  private async requireContact(tenantId: string, id: string) {
    const contact = await this.contactsRepository.findContactById(tenantId, id);
    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  private async resolveCompany(tenantId: string, companyId?: string, companyName?: string) {
    const cleanedCompanyId = this.clean(companyId);
    if (cleanedCompanyId) {
      const company = await this.contactsRepository.findCompanyById(tenantId, cleanedCompanyId);
      if (!company) {
        throw new BadRequestException('Associated company does not belong to the tenant');
      }

      return company;
    }

    const cleanedCompanyName = this.clean(companyName);
    if (!cleanedCompanyName) {
      throw new BadRequestException('Associated company is required');
    }

    const normalizedName = this.normalizeName(cleanedCompanyName);
    const existing = await this.contactsRepository.findCompanyByNormalizedName(tenantId, normalizedName);
    if (existing) {
      return existing;
    }

    return this.contactsRepository.createCompany({
      tenant: { connect: { id: tenantId } },
      name: cleanedCompanyName,
      normalizedName,
    });
  }

  private async buildContactPayload(
    tenantId: string,
    companyId: string,
    dto: CreateContactDto | UpdateContactDto,
    currentContactId?: string,
  ) {
    const firstName = this.clean(dto.firstName);
    if (!firstName) {
      throw new BadRequestException('Contact first name is required');
    }

    const lastName = this.clean(dto.lastName);
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const email = this.clean(dto.email);
    const phone = this.clean(dto.phone);
    const title = this.clean(dto.title);

    if (!fullName) {
      throw new BadRequestException('Contact name is required');
    }

    if (email) {
      const existingByEmail = await this.contactsRepository.findContactByEmail(tenantId, email);
      if (existingByEmail && existingByEmail.id !== currentContactId) {
        throw new BadRequestException('A contact with this email already exists');
      }
    } else {
      const existingByName = await this.contactsRepository.findContactByCompanyAndName(
        tenantId,
        companyId,
        fullName,
      );
      if (existingByName && existingByName.id !== currentContactId) {
        throw new BadRequestException('A contact with this name already exists for the selected company');
      }
    }

    return {
      firstName,
      lastName,
      fullName,
      email,
      phone,
      title,
    };
  }

  private mapContact(contact: any, includeRelations = false) {
    const interactions = this.buildInteractions(contact);
    const lastContactedAt = interactions[0]?.at ?? null;

    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: contact.fullName,
      fullName: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      companyId: contact.companyId,
      companyName: contact.company?.name ?? null,
      company: contact.company
        ? {
            id: contact.company.id,
            name: contact.company.name,
            phone: contact.company.phone,
            website: contact.company.website,
            status: contact.company.status,
          }
        : null,
      lastContactedAt,
      notes: '',
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      ...(includeRelations
        ? {
            interactions,
            stats: {
              convertedLeadCount: contact.convertedLeads?.length ?? 0,
              primaryDealCount: contact.primaryDeals?.length ?? 0,
              primaryCompanyCount: contact.primaryForCompanies?.length ?? 0,
            },
          }
        : {}),
    };
  }

  private buildInteractions(contact: any) {
    const events = [
      ...(contact.convertedLeads ?? []).map((lead: any) => ({
        id: `lead-${lead.id}`,
        type: 'lead-conversion',
        label: 'Lead converted',
        at: lead.updatedAt,
        summary: lead.subject || lead.messagePreview || 'Lead converted into a qualified record',
        metadata: {
          leadId: lead.id,
          leadStatus: lead.status,
          sourceType: lead.sourceType,
        },
      })),
      ...(contact.primaryDeals ?? []).map((deal: any) => ({
        id: `deal-${deal.id}`,
        type: 'deal-primary-contact',
        label: 'Primary deal contact',
        at: deal.updatedAt,
        summary: `${deal.title}${deal.company?.name ? ` for ${deal.company.name}` : ''}`,
        metadata: {
          dealId: deal.id,
          stage: deal.stage,
          value: deal.value ? Number(deal.value) : 0,
        },
      })),
      {
        id: `contact-created-${contact.id}`,
        type: 'contact-created',
        label: 'Contact created',
        at: contact.createdAt,
        summary: `${contact.fullName} was added${contact.company?.name ? ` to ${contact.company.name}` : ''}`,
        metadata: null,
      },
    ];

    return events.sort(
      (left, right) => new Date(right.at).getTime() - new Date(left.at).getTime(),
    );
  }

  private clean(value?: string | null) {
    const next = value?.trim();
    return next ? next : undefined;
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
