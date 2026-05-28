import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DealStage, LeadSourceType, LeadStatus, Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  AssociateInputDto,
  CompanyInputDto,
  ConvertLeadToContactDto,
  ConvertLeadToDealDto,
  CreateInboundLeadDto,
  ListLeadsQueryDto,
  ManualLeadDto,
  LookupQueryDto,
  UpdateLeadStatusDto,
} from 'src/modules/leads/leads.dto';
import { getAllowedLeadSourceTypes } from 'src/modules/leads/lead-source-types';
import { LeadsRepository } from 'src/modules/leads/leads.repository';

@Injectable()
export class LeadsService {
  constructor(private readonly leadsRepository: LeadsRepository) { }

  async intakeLead(clientId: string | undefined, clientSecret: string | undefined, dto: CreateInboundLeadDto) {
    const allowedLeadSourceTypes = getAllowedLeadSourceTypes();

    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Lead intake credentials are required');
    }

    if (!allowedLeadSourceTypes.includes(dto.sourceType)) {
      throw new BadRequestException(
        `sourceType must match one of: ${allowedLeadSourceTypes.join(', ')}`,
      );
    }

    const credential = await this.leadsRepository.findCredentialByClientId(clientId);
    if (!credential) {
      throw new UnauthorizedException('Invalid lead intake credentials');
    }

    const matches = await argon2.verify(credential.clientSecretHash, clientSecret);
    if (!matches) {
      throw new UnauthorizedException('Invalid lead intake credentials');
    }

    this.assertSourcePayload(dto.sourceType, dto.sourcePayload);

    const externalSourceId = this.clean(dto.externalSourceId);
    if (!externalSourceId) {
      throw new BadRequestException('externalSourceId is required');
    }

    const existingLead = await this.leadsRepository.findLeadBySourceIdentity(
      credential.tenantId,
      dto.sourceType,
      externalSourceId,
    );

    const payload = {
      sourceType: dto.sourceType,
      name: this.clean(dto.name),
      email: this.clean(dto.email),
      phone: this.clean(dto.phone),
      companyName: this.clean(dto.companyName),
      subject: this.clean(dto.subject),
      messagePreview: this.clean(dto.messagePreview) ?? this.deriveMessagePreview(dto.sourceType, dto.sourcePayload),
      externalSourceId,
      sourcePayload: dto.sourcePayload as Prisma.InputJsonValue,
      capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : new Date(),
      lastStatusChangedAt: new Date(),
      ingestedCredential: {
        connect: {
          id: credential.id,
        },
      },
    } satisfies Omit<Prisma.LeadCreateInput, 'tenant'>;

    if (existingLead) {
      const updated = await this.leadsRepository.updateLead(existingLead.id, {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        companyName: payload.companyName,
        subject: payload.subject,
        messagePreview: payload.messagePreview,
        externalSourceId: payload.externalSourceId,
        sourcePayload: payload.sourcePayload,
        capturedAt: payload.capturedAt,
        ingestedCredential: payload.ingestedCredential,
      });

      return this.mapLead(updated);
    }

    const lead = await this.leadsRepository.createLead({
      tenant: { connect: { id: credential.tenantId } },
      ...payload,
    });

    return this.mapLead(lead);
  }

  async listLeads(tenantId: string, query: ListLeadsQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const search = this.clean(query.search);

    const where: Prisma.LeadWhereInput = {
      tenantId,
      isDeleted: false,
      ...(query.status ? { status: query.status } : { status: { not: LeadStatus.ARCHIVED } }),
      ...(query.sourceType ? { sourceType: query.sourceType } : {}),
      ...(search
        ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { companyName: { contains: search, mode: 'insensitive' } },
            { subject: { contains: search, mode: 'insensitive' } },
            // Add matching source types
            ...Object.values(LeadSourceType)
              .filter(type =>
                this.sourceLabel(type).toLowerCase().includes(search.toLowerCase()) ||
                type.toLowerCase().includes(search.toLowerCase())
              )
              .map(type => ({ sourceType: type }))
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.leadsRepository.listLeads(
        where,
        (page - 1) * limit,
        limit,
        query.sortField,
        query.sortOrder,
      ),
      this.leadsRepository.countLeads(where),
    ]);

    return {
      items: items.map((item) => this.mapLead(item)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getLead(tenantId: string, id: string) {
    const lead = await this.requireLead(tenantId, id);
    return this.mapLead(lead, true);
  }

  async createManualLead(tenantId: string, dto: ManualLeadDto) {
    const cleanedName = this.clean(dto.name);
    const cleanedEmail = this.clean(dto.email);
    const cleanedPhone = this.clean(dto.phone);
    const cleanedCompanyName = this.clean(dto.companyName);
    const cleanedSubject = this.clean(dto.subject);
    const cleanedMessage = this.clean(dto.messagePreview);

    if (!cleanedName && !cleanedEmail && !cleanedPhone) {
      throw new BadRequestException('Name, email, or phone is required');
    }

    const company = dto.companyId
      ? await this.leadsRepository.findCompanyById(tenantId, dto.companyId)
      : null;

    if (dto.companyId && !company) {
      throw new BadRequestException('Company does not belong to the tenant');
    }

    const lead = await this.leadsRepository.createLead({
      tenant: { connect: { id: tenantId } },
      sourceType: LeadSourceType.CUSTOM,
      status: dto.status ?? LeadStatus.NEW,
      name: cleanedName,
      email: cleanedEmail,
      phone: cleanedPhone,
      companyName: company?.name ?? cleanedCompanyName,
      subject: cleanedSubject,
      messagePreview: cleanedMessage,
      sourcePayload: {
        source: 'Manual Entry',
        subject: cleanedSubject ?? null,
        message: cleanedMessage ?? null,
      },
      capturedAt: new Date(),
      lastStatusChangedAt: new Date(),
      ...(company ? { company: { connect: { id: company.id } } } : {}),
    });

    return this.mapLead(lead, true);
  }

  async updateManualLead(tenantId: string, id: string, dto: ManualLeadDto) {
    const existing = await this.requireLead(tenantId, id);
    const company = dto.companyId
      ? await this.leadsRepository.findCompanyById(tenantId, dto.companyId)
      : null;

    if (dto.companyId && !company) {
      throw new BadRequestException('Company does not belong to the tenant');
    }

    const sourcePayload = {
      ...(existing.sourcePayload && typeof existing.sourcePayload === 'object' && !Array.isArray(existing.sourcePayload)
        ? existing.sourcePayload
        : {}),
      source: existing.sourceType === LeadSourceType.CUSTOM ? 'Manual Entry' : existing.sourceType,
      subject: this.clean(dto.subject) ?? existing.subject ?? null,
      message: this.clean(dto.messagePreview) ?? existing.messagePreview ?? null,
    } as Prisma.InputJsonValue;

    const lead = await this.leadsRepository.updateLead(id, {
      ...(dto.name !== undefined ? { name: this.clean(dto.name) } : {}),
      ...(dto.email !== undefined ? { email: this.clean(dto.email) } : {}),
      ...(dto.phone !== undefined ? { phone: this.clean(dto.phone) } : {}),
      ...(dto.subject !== undefined ? { subject: this.clean(dto.subject) } : {}),
      ...(dto.messagePreview !== undefined ? { messagePreview: this.clean(dto.messagePreview) } : {}),
      ...(dto.status !== undefined
        ? {
          status: dto.status,
          lastStatusChangedAt: new Date(),
          archivedAt: dto.status === LeadStatus.ARCHIVED ? new Date() : null,
        }
        : {}),
      ...(dto.companyId !== undefined
        ? company
          ? { company: { connect: { id: company.id } }, companyName: company.name }
          : { company: { disconnect: true }, companyName: this.clean(dto.companyName) }
        : dto.companyName !== undefined
          ? { companyName: this.clean(dto.companyName) }
          : {}),
      sourcePayload,
    });

    return this.mapLead(lead, true);
  }

  async updateLeadStatus(tenantId: string, id: string, dto: UpdateLeadStatusDto) {
    await this.requireLead(tenantId, id);
    const lead = await this.leadsRepository.updateLead(id, {
      status: dto.status,
      lastStatusChangedAt: new Date(),
      archivedAt: dto.status === LeadStatus.ARCHIVED ? new Date() : null,
    });

    return this.mapLead(lead, true);
  }

  async archiveLead(tenantId: string, id: string) {
    return this.updateLeadStatus(tenantId, id, { status: LeadStatus.ARCHIVED });
  }

  async deleteLead(tenantId: string, id: string) {
    await this.requireLead(tenantId, id);
    await this.leadsRepository.softDeleteLead(id);
    return { success: true };
  }

  async listCompanies(tenantId: string, query: LookupQueryDto) {
    const companies = await this.leadsRepository.listCompanies(
      tenantId,
      this.clean(query.search),
      Number(query.limit || 20),
    );

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      phone: company.phone,
      website: company.website,
      taxId: company.taxId,
      billingStreet: company.billingStreet,
      billingCity: company.billingCity,
      billingState: company.billingState,
      billingCountry: company.billingCountry,
      billingZip: company.billingZip,
      primaryContact: company.primaryContact ? this.mapContact(company.primaryContact) : null,
      contactCount: company._count.contacts,
      dealCount: company._count.deals,
    }));
  }

  async createCompany(tenantId: string, dto: CompanyInputDto) {
    const company = await this.resolveCompany(tenantId, dto.name, undefined, dto);
    if (!company) {
      throw new BadRequestException('Company name is required');
    }

    return {
      id: company.id,
      name: company.name,
      phone: company.phone,
      website: company.website,
      taxId: company.taxId,
      billingStreet: company.billingStreet,
      billingCity: company.billingCity,
      billingState: company.billingState,
      billingCountry: company.billingCountry,
      billingZip: company.billingZip,
    };
  }

  async convertLeadToContact(tenantId: string, id: string, dto: ConvertLeadToContactDto) {
    const lead = await this.requireLead(tenantId, id);
    const company = await this.resolveCompany(tenantId, this.clean(dto.companyName ?? lead.companyName), dto.companyId);
    if (!company) {
      throw new BadRequestException('Associated company is required');
    }
    const contact = await this.resolveContact(tenantId, {
      companyId: company.id,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email ?? lead.email ?? undefined,
      phone: dto.phone ?? lead.phone ?? undefined,
      title: dto.title,
    });

    const nextLead = await this.leadsRepository.updateLead(lead.id, {
      status: LeadStatus.QUALIFIED,
      lastStatusChangedAt: new Date(),
      name: lead.name || this.clean(`${dto.firstName} ${dto.lastName || ''}`),
      email: lead.email || this.clean(dto.email),
      phone: lead.phone || this.clean(dto.phone),
      company: { connect: { id: company.id } },
      companyName: company.name,
      convertedContact: { connect: { id: contact.id } },
    });

    if (!company.primaryContactId) {
      await this.leadsRepository.updateCompany(company.id, {
        primaryContact: { connect: { id: contact.id } },
      });
    }

    return {
      lead: this.mapLead(nextLead, true),
      contact: this.mapContact(contact),
      company: {
        id: company.id,
        name: company.name,
      },
    };
  }

  async convertLeadToDeal(tenantId: string, id: string, dto: ConvertLeadToDealDto) {
    const lead = await this.requireLead(tenantId, id);
    const company = await this.resolveCompany(tenantId, this.clean(dto.companyName ?? lead.companyName), dto.companyId, {
      name: dto.companyName ?? lead.companyName ?? 'Unknown Company',
      taxId: dto.taxId,
      billingStreet: dto.billingStreet,
      billingCity: dto.billingCity,
      billingState: dto.billingState,
      billingCountry: dto.billingCountry,
      billingZip: dto.billingZip,
    });

    if (!company) {
      throw new BadRequestException('Associated company is required');
    }

    const contact = await this.resolveDealPrimaryContact(tenantId, company.id, lead, dto);
    if (dto.stage === DealStage.CLOSED_WON && !contact) {
      throw new BadRequestException('Primary contact is required when moving a deal to Closed Won');
    }

    const associate = dto.associateId || dto.associateName
      ? await this.resolveAssociate(tenantId, dto.associateName, dto.associateId, {
        name: dto.associateName ?? 'Associate',
        email: dto.associateEmail,
        phone: dto.associatePhone,
      })
      : null;

    const existingDeal = await this.leadsRepository.findDealBySourceLeadId(lead.id);

    const dealData: any = {
      title: dto.title,
      description: this.clean(dto.description) ?? lead.messagePreview,
      currency: dto.currency,
      value: new Prisma.Decimal(dto.value),
      stage: dto.stage,
      associateSuccessFee:
        dto.associateSuccessFee === undefined || dto.associateSuccessFee === null
          ? null
          : new Prisma.Decimal(dto.associateSuccessFee),
      company: { connect: { id: company.id } },
      primaryContact: contact ? { connect: { id: contact.id } } : { disconnect: true },
      associate: associate ? { connect: { id: associate.id } } : { disconnect: true },
    };

    let deal;
    if (existingDeal) {
      deal = await this.leadsRepository.updateDeal(existingDeal.id, dealData);
    } else {
      deal = await this.leadsRepository.createDeal({
        ...dealData,
        tenant: { connect: { id: tenantId } },
        sourceLead: { connect: { id: lead.id } },
        primaryContact: contact ? { connect: { id: contact.id } } : undefined,
        associate: associate ? { connect: { id: associate.id } } : undefined,
      });
    }

    if (dto.stage === DealStage.CLOSED_WON) {
      await this.handleWorkOrderUpsert(deal.id, tenantId, dto);
    }

    // Refetch to get updated relation
    const finalDeal = await this.leadsRepository.findDealBySourceLeadId(lead.id);

    const nextLead = await this.leadsRepository.updateLead(lead.id, {
      status: LeadStatus.QUALIFIED,
      lastStatusChangedAt: new Date(),
      company: { connect: { id: company.id } },
      companyName: company.name,
      ...(contact ? { convertedContact: { connect: { id: contact.id } } } : {}),
    });

    if (contact && !company.primaryContactId) {
      await this.leadsRepository.updateCompany(company.id, {
        primaryContact: { connect: { id: contact.id } },
      });
    }

    return {
      lead: this.mapLead(nextLead, true),
      deal: this.mapDeal(finalDeal),
      company: {
        id: company.id,
        name: company.name,
      },
      primaryContact: contact ? this.mapContact(contact) : null,
      associate: associate
        ? {
          id: associate.id,
          name: associate.name,
          email: associate.email,
          phone: associate.phone,
        }
        : null,
    };
  }

  private async handleWorkOrderUpsert(dealId: string, tenantId: string, dto: any) {
    const workOrderData: any = {};
    
    if (dto.value !== undefined) workOrderData.actualValue = dto.value;
    if (dto.taxId !== undefined) workOrderData.taxId = dto.taxId;
    if (dto.billingStreet !== undefined) workOrderData.billingStreet = dto.billingStreet;
    if (dto.billingCity !== undefined) workOrderData.billingCity = dto.billingCity;
    if (dto.billingState !== undefined) workOrderData.billingState = dto.billingState;
    if (dto.billingCountry !== undefined) workOrderData.billingCountry = dto.billingCountry;
    if (dto.billingZip !== undefined) workOrderData.billingZip = dto.billingZip;
    if (dto.paymentTerms !== undefined) workOrderData.paymentTerms = dto.paymentTerms;
    if (dto.projectType !== undefined) workOrderData.projectType = dto.projectType;
    if (dto.poNumber !== undefined) workOrderData.poNumber = dto.poNumber;
    if (dto.poDate !== undefined) workOrderData.poDate = dto.poDate ? new Date(dto.poDate) : null;
    if (dto.poEndDate !== undefined) workOrderData.poEndDate = dto.poEndDate ? new Date(dto.poEndDate) : null;
    if (dto.poDocumentUrl !== undefined) workOrderData.poDocumentUrl = dto.poDocumentUrl;
    if (dto.duration !== undefined) workOrderData.duration = dto.duration;

    if (workOrderData.actualValue === undefined) {
      const deal = await this.leadsRepository.findDealBySourceLeadId(dealId); // This might need a different lookup if dealId is passed
      workOrderData.actualValue = deal?.value || 0;
    }

    await this.leadsRepository.upsertWorkOrder(dealId, tenantId, workOrderData);
  }

  private async requireLead(tenantId: string, id: string) {
    const lead = await this.leadsRepository.findLeadById(tenantId, id);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  private async resolveCompany(tenantId: string, name?: string, companyId?: string, payload?: Partial<CompanyInputDto>) {
    if (companyId) {
      const company = await this.leadsRepository.findCompanyById(tenantId, companyId);
      if (!company) {
        throw new BadRequestException('Company does not belong to the tenant');
      }

      if (!payload) {
        return company;
      }

      return this.leadsRepository.updateCompany(company.id, {
        phone: this.clean(payload.phone) ?? company.phone,
        website: this.clean(payload.website) ?? company.website,
        taxId: this.clean(payload.taxId) ?? company.taxId,
        billingStreet: this.clean(payload.billingStreet) ?? company.billingStreet,
        billingCity: this.clean(payload.billingCity) ?? company.billingCity,
        billingState: this.clean(payload.billingState) ?? company.billingState,
        billingCountry: this.clean(payload.billingCountry) ?? company.billingCountry,
        billingZip: this.clean(payload.billingZip) ?? company.billingZip,
      });
    }

    const cleanedName = this.clean(name);
    if (!cleanedName) {
      return null;
    }

    const normalizedName = this.normalizeName(cleanedName);
    const existing = await this.leadsRepository.findCompanyByNormalizedName(tenantId, normalizedName);
    if (existing) {
      if (!payload) {
        return existing;
      }

      return this.leadsRepository.updateCompany(existing.id, {
        phone: this.clean(payload.phone) ?? existing.phone,
        website: this.clean(payload.website) ?? existing.website,
        taxId: this.clean(payload.taxId) ?? existing.taxId,
        billingStreet: this.clean(payload.billingStreet) ?? existing.billingStreet,
        billingCity: this.clean(payload.billingCity) ?? existing.billingCity,
        billingState: this.clean(payload.billingState) ?? existing.billingState,
        billingCountry: this.clean(payload.billingCountry) ?? existing.billingCountry,
        billingZip: this.clean(payload.billingZip) ?? existing.billingZip,
      });
    }

    const createPayload = payload ?? { name: cleanedName };
    return this.leadsRepository.createCompany({
      tenant: { connect: { id: tenantId } },
      name: cleanedName,
      normalizedName,
      phone: this.clean(createPayload.phone),
      website: this.clean(createPayload.website),
      taxId: this.clean(createPayload.taxId),
      billingStreet: this.clean(createPayload.billingStreet),
      billingCity: this.clean(createPayload.billingCity),
      billingState: this.clean(createPayload.billingState),
      billingCountry: this.clean(createPayload.billingCountry),
      billingZip: this.clean(createPayload.billingZip),
    });
  }

  private async resolveContact(
    tenantId: string,
    input: {
      companyId?: string;
      firstName: string;
      lastName?: string;
      email?: string;
      phone?: string;
      title?: string;
    },
  ) {
    const firstName = this.clean(input.firstName);
    if (!firstName) {
      throw new BadRequestException('First name is required');
    }

    const lastName = this.clean(input.lastName);
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const email = this.clean(input.email);
    const phone = this.clean(input.phone);
    const title = this.clean(input.title);

    const existing = email
      ? await this.leadsRepository.findContactByEmail(tenantId, email)
      : await this.leadsRepository.findContactByCompanyAndName(tenantId, input.companyId, fullName);

    if (existing) {
      return this.leadsRepository.updateContact(existing.id, {
        firstName,
        lastName,
        fullName,
        phone: phone ?? existing.phone,
        title: title ?? existing.title,
        ...(input.companyId ? { company: { connect: { id: input.companyId } } } : {}),
      });
    }

    return this.leadsRepository.createContact({
      tenant: { connect: { id: tenantId } },
      firstName,
      lastName,
      fullName,
      email,
      phone,
      title,
      ...(input.companyId ? { company: { connect: { id: input.companyId } } } : {}),
    });
  }

  private async resolveAssociate(tenantId: string, name?: string, associateId?: string, payload?: Partial<AssociateInputDto>) {
    if (associateId) {
      const associate = await this.leadsRepository.findAssociateById(tenantId, associateId);
      if (!associate) {
        throw new BadRequestException('Associate does not belong to the tenant');
      }

      if (!payload) {
        return associate;
      }

      return this.leadsRepository.updateAssociate(associate.id, {
        email: this.clean(payload.email) ?? associate.email,
        phone: this.clean(payload.phone) ?? associate.phone,
      });
    }

    const cleanedName = this.clean(name);
    if (!cleanedName) {
      return null;
    }

    const normalizedName = this.normalizeName(cleanedName);
    const existing = await this.leadsRepository.findAssociateByNormalizedName(tenantId, normalizedName);
    if (existing) {
      if (!payload) {
        return existing;
      }

      return this.leadsRepository.updateAssociate(existing.id, {
        email: this.clean(payload.email) ?? existing.email,
        phone: this.clean(payload.phone) ?? existing.phone,
      });
    }

    return this.leadsRepository.createAssociate({
      tenant: { connect: { id: tenantId } },
      name: cleanedName,
      normalizedName,
      email: this.clean(payload?.email),
      phone: this.clean(payload?.phone),
    });
  }

  private async resolveDealPrimaryContact(tenantId: string, companyId: string, lead: any, dto: ConvertLeadToDealDto) {
    if (dto.primaryContactId) {
      const existing = await this.leadsRepository.findContactById(tenantId, dto.primaryContactId);
      if (!existing) {
        throw new BadRequestException('Primary contact does not belong to the tenant');
      }
      if (existing.companyId !== companyId) {
        throw new BadRequestException('Primary contact must belong to the selected company');
      }

      return existing;
    }

    const rawName = this.clean(dto.primaryContactName) ?? this.clean(lead.name);
    const email = this.clean(dto.primaryContactEmail) ?? this.clean(lead.email);
    const phone = this.clean(dto.primaryContactPhone) ?? this.clean(lead.phone);

    if (!rawName && !email && dto.stage !== DealStage.CLOSED_WON) {
      return null;
    }

    if (!rawName && email) {
      const [firstName, ...rest] = email.split('@')[0].split(/[._-]/g);
      return this.resolveContact(tenantId, {
        companyId,
        firstName: firstName || 'Primary',
        lastName: rest.join(' '),
        email,
        phone,
      });
    }

    if (!rawName) {
      return null;
    }

    const [firstName, ...rest] = rawName.split(' ');
    return this.resolveContact(tenantId, {
      companyId,
      firstName,
      lastName: rest.join(' '),
      email,
      phone,
    });
  }

  private assertSourcePayload(sourceType: LeadSourceType, payload: Record<string, unknown>) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new BadRequestException('sourcePayload must be an object');
    }

    const has = (...keys: string[]) =>
      keys.some((key) => typeof payload[key] === 'string' && this.clean(payload[key] as string));
    const hasArray = (key: string) => Array.isArray(payload[key]) && (payload[key] as unknown[]).length > 0;

    const valid: Record<LeadSourceType, boolean> = {
      WEB_FORM: has('subject', 'message', 'pageSource'),
      AI_ASSISTANT: hasArray('chatLog') || has('sessionDuration', 'transcript'),
      WHATSAPP: hasArray('chatHistory') || has('lastMessage'),
      RESOURCE_DOWNLOAD: has('contentTitle', 'contentType'),
      EVENT_REGISTRATION: has('webinarTitle', 'webinarDate'),
      EMAIL_INQUIRY: has('subject', 'message'),
      LINKEDIN: has('profileUrl', 'message'),
      CUSTOM: false,
    };

    if (!valid[sourceType]) {
      throw new BadRequestException('sourcePayload is missing the expected fields for the selected sourceType');
    }
  }

  private deriveMessagePreview(sourceType: LeadSourceType, payload: Record<string, unknown>) {
    const get = (key: string) =>
      this.clean(typeof payload[key] === 'string' ? (payload[key] as string) : undefined);

    switch (sourceType) {
      case LeadSourceType.WEB_FORM:
      case LeadSourceType.EMAIL_INQUIRY:
        return get('message');
      case LeadSourceType.WHATSAPP:
        return get('lastMessage');
      case LeadSourceType.LINKEDIN:
        return get('message');
      case LeadSourceType.RESOURCE_DOWNLOAD:
        return get('contentTitle');
      case LeadSourceType.EVENT_REGISTRATION:
        return get('webinarTitle');
      default:
        return undefined;
    }
  }

  private mapLead(lead: any, includeRelations = false) {
    return {
      id: lead.id,
      sourceType: lead.sourceType,
      sourceLabel: this.sourceLabel(lead.sourceType),
      status: lead.status,
      statusLabel: this.statusLabel(lead.status),
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      companyId: lead.companyId,
      company: lead.company?.name ?? lead.companyName,
      subject: lead.subject,
      messagePreview: lead.messagePreview,
      externalSourceId: lead.externalSourceId,
      capturedAt: lead.capturedAt,
      details: lead.sourcePayload,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
      ...(includeRelations
        ? {
          companyRecord: lead.company
            ? {
              id: lead.company.id,
              name: lead.company.name,
              phone: lead.company.phone,
              website: lead.company.website,
              taxId: lead.company.taxId,
            }
            : null,
          convertedContact: lead.convertedContact ? this.mapContact(lead.convertedContact) : null,
          convertedDeal: lead.convertedDeal ? this.mapDeal(lead.convertedDeal) : null,
        }
        : {}),
    };
  }

  private mapContact(contact: any) {
    return {
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: contact.fullName,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      companyId: contact.companyId,
      companyName: contact.company?.name ?? null,
    };
  }

  private mapDeal(deal: any) {
    if (!deal) return null;
    const { workOrder, ...rest } = deal;
    return {
      ...rest,
      value: Number(deal.value),
      associateSuccessFee: deal.associateSuccessFee == null ? null : Number(deal.associateSuccessFee),
      ...(workOrder ? {
        ...workOrder,
        actualWorkOrderValue: Number(workOrder.actualValue),
        // Ensure the nested ID doesn't overwrite the Deal ID
        id: deal.id,
      } : {}),
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    };
  }

  private clean(value?: string | null) {
    const next = value?.trim();
    return next ? next : undefined;
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private sourceLabel(sourceType: LeadSourceType) {
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

  private statusLabel(status: LeadStatus) {
    const labels: Record<LeadStatus, string> = {
      NEW: 'New',
      QUALIFIED: 'Qualified',
      ARCHIVED: 'Archived',
      CONTACTED: 'Contacted', // Add this

    };

    return labels[status];
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
}
