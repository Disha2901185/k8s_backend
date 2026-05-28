import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DealStage, LeadSourceType, Prisma } from '@prisma/client';
import {
  CreateCompanyDto,
  ListCompaniesQueryDto,
  SaveCompanyDealDto,
  UpdateCompanyDto,
} from 'src/modules/companies/companies.dto';
import { CompaniesRepository } from 'src/modules/companies/companies.repository';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CompaniesService {
  constructor(private readonly companiesRepository: CompaniesRepository) {}

  private readonly constantsPath = path.join(process.cwd(), 'constant.js');
  private readonly ratesRefreshIntervalMs = 6 * 60 * 60 * 1000;

  async listCompanies(tenantId: string, query: ListCompaniesQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 20);
    const search = this.clean(query.search);

    const where: Prisma.CompanyWhereInput = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { industry: { contains: search, mode: 'insensitive' } },
              { website: { contains: search, mode: 'insensitive' } },
              { status: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.companiesRepository.listCompanies(where, (page - 1) * limit, limit),
      this.companiesRepository.countCompanies(where),
    ]);

    const mappedItems = await this.mapCompaniesWithTotals(tenantId, items);

    return {
      items: mappedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getCompany(tenantId: string, id: string) {
    await this.refreshExchangeRatesIfNeeded();
    const company = await this.requireCompany(tenantId, id);
    const totals = await this.companiesRepository.getDealTotalsByCompanyIds(tenantId, [company.id]);
    const totalByCompanyId = new Map<string, number>();

    for (const entry of totals) {
      const companyId = entry.companyId;
      const currency = (entry as any).currency || 'INR';
      const rawValue = entry._sum.value ? Number(entry._sum.value) : 0;
      
      const convertedValue = this.convertToINR(rawValue, currency);
      const currentTotal = totalByCompanyId.get(companyId) || 0;
      totalByCompanyId.set(companyId, currentTotal + convertedValue);
    }

    return this.mapCompanyDetail(company, totalByCompanyId);
  }

  async createCompany(tenantId: string, dto: CreateCompanyDto) {
    const name = this.clean(dto.name);
    if (!name) {
      throw new BadRequestException('Company name is required');
    }

    const normalizedName = this.normalizeName(name);
    const existing = await this.companiesRepository.findByNormalizedName(
      tenantId,
      normalizedName,
    );

    if (existing) {
      throw new BadRequestException('A company with this name already exists');
    }

    const company = await this.companiesRepository.create({
      tenant: { connect: { id: tenantId } },
      name,
      normalizedName,
      industry: this.clean(dto.industry),
      phone: this.clean(dto.phone),
      website: this.clean(dto.website),
      status: this.clean(dto.status) ?? 'Prospect',
      taxId: this.clean(dto.taxId),
      currency: this.clean(dto.currency),
      billingStreet: this.clean(dto.billingStreet),
      billingCity: this.clean(dto.billingCity),
      billingState: this.clean(dto.billingState),
      billingCountry: this.clean(dto.billingCountry),
      billingZip: this.clean(dto.billingZip),
      placeOfSupply: this.clean(dto.placeOfSupply),
    });

    const [mapped] = await this.mapCompaniesWithTotals(tenantId, [company]);
    return mapped;
  }

  async updateCompany(tenantId: string, id: string, dto: UpdateCompanyDto) {
    const company = await this.requireCompany(tenantId, id);
    const nextName = this.clean(dto.name);

    if (!nextName) {
      throw new BadRequestException('Company name is required');
    }

    const normalizedName = this.normalizeName(nextName);
    const existing = await this.companiesRepository.findByNormalizedName(
      tenantId,
      normalizedName,
    );

    if (existing && existing.id !== company.id) {
      throw new BadRequestException('A company with this name already exists');
    }

    const updated = await this.companiesRepository.update(company.id, {
      name: nextName,
      normalizedName,
      industry: this.clean(dto.industry),
      phone: this.clean(dto.phone),
      website: this.clean(dto.website),
      status: this.clean(dto.status) ?? 'Prospect',
      taxId: this.clean(dto.taxId),
      currency: this.clean(dto.currency),
      billingStreet: this.clean(dto.billingStreet),
      billingCity: this.clean(dto.billingCity),
      billingState: this.clean(dto.billingState),
      billingCountry: this.clean(dto.billingCountry),
      billingZip: this.clean(dto.billingZip),
      placeOfSupply: this.clean(dto.placeOfSupply),
    });

    const [mapped] = await this.mapCompaniesWithTotals(tenantId, [updated]);
    return mapped;
  }

  async deleteCompany(tenantId: string, id: string) {
    const company = await this.requireCompany(tenantId, id);

    if ((company._count?.deals ?? 0) > 0) {
      throw new BadRequestException('Cannot delete a company that is linked to deals');
    }

    await this.companiesRepository.delete(company.id);
    return { success: true };
  }

  async createCompanyDeal(tenantId: string, companyId: string, dto: SaveCompanyDealDto) {
    const company = await this.requireCompany(tenantId, companyId);
    const contact = await this.resolveCompanyDealPrimaryContact(tenantId, company.id, dto);
    const associate = await this.resolveAssociate(tenantId, dto.associateName, dto.associateId);

    const deal = await this.companiesRepository.createDeal({
      tenant: { connect: { id: tenantId } },
      company: { connect: { id: company.id } },
      title: dto.title,
      description: this.clean(dto.description),
      currency: dto.currency,
      value: new Prisma.Decimal(dto.value),
      stage: dto.stage,
      ...(dto.associateSuccessFee === undefined || dto.associateSuccessFee === null
        ? {}
        : { associateSuccessFee: new Prisma.Decimal(dto.associateSuccessFee) }),
      ...(contact ? { primaryContact: { connect: { id: contact.id } } } : {}),
      ...(associate ? { associate: { connect: { id: associate.id } } } : {}),
    });

    if (dto.stage === 'CLOSED_WON') {
      await this.handleWorkOrderUpsert(deal.id, tenantId, dto);
    }

    if (contact && !company.primaryContactId) {
      await this.companiesRepository.update(company.id, {
        primaryContact: { connect: { id: contact.id } },
      });
    }

    return this.mapDeal(deal);
  }

  async updateCompanyDeal(tenantId: string, companyId: string, dealId: string, dto: SaveCompanyDealDto) {
    await this.requireCompany(tenantId, companyId);
    await this.requireCompanyDeal(tenantId, companyId, dealId);
    const contact = await this.resolveCompanyDealPrimaryContact(tenantId, companyId, dto);
    const associate = await this.resolveAssociate(tenantId, dto.associateName, dto.associateId);

    const deal = await this.companiesRepository.updateDeal(dealId, {
      title: dto.title,
      description: this.clean(dto.description),
      currency: dto.currency,
      value: new Prisma.Decimal(dto.value),
      stage: dto.stage,
      associateSuccessFee:
        dto.associateSuccessFee === undefined || dto.associateSuccessFee === null
          ? null
          : new Prisma.Decimal(dto.associateSuccessFee),
      primaryContact: contact ? { connect: { id: contact.id } } : { disconnect: true },
      associate: associate ? { connect: { id: associate.id } } : { disconnect: true },
    });

    if (dto.stage) {
      if (dto.stage === 'CLOSED_WON') {
        await this.handleWorkOrderUpsert(dealId, tenantId, dto);
      } else {
        await this.companiesRepository.deleteWorkOrder(dealId);
      }
    }

    return this.mapDeal(deal);
  }

  async deleteCompanyDeal(tenantId: string, companyId: string, dealId: string) {
    await this.requireCompany(tenantId, companyId);
    await this.requireCompanyDeal(tenantId, companyId, dealId);
    await this.companiesRepository.deleteWorkOrder(dealId);
    await this.companiesRepository.deleteDeal(dealId);
    return { success: true };
  }

  private async requireCompany(tenantId: string, id: string) {
    const company = await this.companiesRepository.findById(tenantId, id);
    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  private async requireCompanyDeal(tenantId: string, companyId: string, dealId: string) {
    const deal = await this.companiesRepository.findDealById(tenantId, companyId, dealId);
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    return deal;
  }

  private convertToINR(value: number, currency: string | null | undefined): number {
    if (!value) return 0;
    const curr = (currency || 'INR').toUpperCase();
    if (curr === 'INR') return value;

    const constants = this.loadAppConstants();
    const rates = constants.CURRENCY_RATES || {};
    const usdToInr = Number(rates.INR);

    if (!usdToInr || Number.isNaN(usdToInr)) return value;
    if (curr === 'USD') return value * usdToInr;

    const usdToTarget = Number(rates[curr]);
    if (!usdToTarget || Number.isNaN(usdToTarget)) return value;

    return value * (usdToInr / usdToTarget);
  }

  private async mapCompaniesWithTotals(tenantId: string, companies: any[]) {
    await this.refreshExchangeRatesIfNeeded();
    const totals = await this.companiesRepository.getDealTotalsByCompanyIds(
      tenantId,
      companies.map((company) => company.id),
    );

    const totalByCompanyId = new Map<string, number>();

    for (const entry of totals) {
      const companyId = entry.companyId;
      const currency = (entry as any).currency || 'INR';
      const rawValue = entry._sum.value ? Number(entry._sum.value) : 0;
      
      const convertedValue = this.convertToINR(rawValue, currency);
      const currentTotal = totalByCompanyId.get(companyId) || 0;
      totalByCompanyId.set(companyId, currentTotal + convertedValue);
    }

    return companies.map((company) => this.mapCompany(company, totalByCompanyId));
  }

  private loadAppConstants() {
    const resolved = require.resolve(this.constantsPath);
    delete require.cache[resolved];
    return require(this.constantsPath);
  }

  private saveAppConstants(constants: any) {
    if (!constants || typeof constants !== 'object' || Array.isArray(constants)) {
      throw new Error('Refusing to write invalid constants payload');
    }

    const serialized = JSON.stringify(constants, null, 2);
    if (!serialized || serialized === 'null') {
      throw new Error('Refusing to write empty constants payload');
    }

    const content = `module.exports = ${serialized};\n`;
    fs.writeFileSync(this.constantsPath, content, 'utf8');
  }

  private async refreshExchangeRatesIfNeeded() {
    const constants = this.loadAppConstants();
    const lastFetchedAtRaw = constants.CURRENCY_RATES_LAST_FETCHED_AT;
    const lastFetchedAtMs = lastFetchedAtRaw ? new Date(lastFetchedAtRaw).getTime() : 0;
    const nowMs = Date.now();

    if (lastFetchedAtMs && nowMs - lastFetchedAtMs < this.ratesRefreshIntervalMs) {
      return;
    }

    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      return;
    }

    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
      if (!response.ok) {
        return;
      }

      const payload = await response.json();
      const conversionRates = payload?.conversion_rates;
      if (!conversionRates || typeof conversionRates !== 'object') {
        return;
      }

      constants.CURRENCY_RATES = {
        USD: Number(conversionRates.USD ?? 1),
        INR: Number(conversionRates.INR ?? constants?.CURRENCY_RATES?.INR ?? 0),
        EUR: Number(conversionRates.EUR ?? constants?.CURRENCY_RATES?.EUR ?? 0),
        GBP: Number(conversionRates.GBP ?? constants?.CURRENCY_RATES?.GBP ?? 0),
        AED: Number(conversionRates.AED ?? constants?.CURRENCY_RATES?.AED ?? 0),
      };
      constants.CURRENCY_RATES_LAST_FETCHED_AT = new Date().toISOString();
      this.saveAppConstants(constants);
    } catch {
      // Keep previous rates on network/API failure.
    }
  }

  private mapCompany(company: any, totalByCompanyId: Map<string, number>) {
    return {
      id: company.id,
      name: company.name,
      industry: company.industry,
      phone: company.phone,
      website: company.website,
      status: company.status,
      taxId: company.taxId,
      currency: company.currency,
      billingStreet: company.billingStreet,
      billingCity: company.billingCity,
      billingState: company.billingState,
      billingCountry: company.billingCountry,
      billingZip: company.billingZip,
      placeOfSupply: company.placeOfSupply,
      primaryContact: company.primaryContact
        ? {
            id: company.primaryContact.id,
            name: company.primaryContact.fullName,
            email: company.primaryContact.email,
            phone: company.primaryContact.phone,
          }
        : null,
      contactCount: company._count?.contacts ?? 0,
      dealCount: company._count?.deals ?? 0,
      totalSpend: totalByCompanyId.get(company.id) ?? 0,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    };
  }

  private mapCompanyDetail(company: any, totalByCompanyId: Map<string, number>) {
    const contacts = (company.contacts ?? []).map((contact: any) => ({
      id: contact.id,
      firstName: contact.firstName,
      lastName: contact.lastName,
      name: contact.fullName,
      fullName: contact.fullName,
      role: contact.title,
      title: contact.title,
      email: contact.email,
      phone: contact.phone,
      isPrimary: company.primaryContactId === contact.id,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    }));

    const deals = (company.deals ?? []).map((deal: any) => this.mapDeal(deal));

    const interactions = this.buildCompanyInteractions(company);
    const financialSummary = this.buildFinancialSummary(company);
    return {
      ...this.mapCompany(company, totalByCompanyId),
      gstIn: company.taxId ?? null,
      currency: company.currency ?? null,
      address: {
        line1: company.billingStreet ?? null,
        city: company.billingCity ?? null,
        state: company.billingState ?? null,
        country: company.billingCountry ?? null,
        pincode: company.billingZip ?? null,
      },
      contacts,
      deals,
      messages: interactions.filter((item) => item.type === 'email' || item.type === 'whatsapp'),
      activities: interactions.filter((item) => item.type !== 'email' && item.type !== 'whatsapp'),
      timeline: interactions,
      tasks: [],
      notes: [],
      financialSummary,
    };
  }

  private buildFinancialSummary(company: any) {
    const deals = company.deals ?? [];
    const activeDeals = deals.filter((deal: any) => this.isActiveDeal(deal.stage));
    const wonDeals = deals.filter((deal: any) => deal.stage === DealStage.CLOSED_WON);
    
    const totalReceived = wonDeals.reduce(
      (sum: number, deal: any) => sum + this.convertToINR(Number(deal.value ?? 0), deal.currency),
      0,
    );
    const currency = 'INR';

    return {
      currency,
      totalOutstanding: activeDeals.reduce(
        (sum: number, deal: any) => sum + this.convertToINR(Number(deal.value ?? 0), deal.currency),
        0,
      ),
      ytdRevenue: totalReceived,
      ytdRevenueProjects: wonDeals.length,
      totalReceived,
      totalReceivedProjects: wonDeals.length,
      openOrders: activeDeals.length,
      totalOrders: deals.length,
    };
  }

  private async resolveCompanyDealPrimaryContact(tenantId: string, companyId: string, dto: SaveCompanyDealDto) {
    if (dto.primaryContactId) {
      const existing = await this.companiesRepository.findContactById(tenantId, dto.primaryContactId);
      if (!existing) {
        throw new BadRequestException('Primary contact does not belong to the tenant');
      }
      if (existing.companyId !== companyId) {
        throw new BadRequestException('Primary contact must belong to the selected company');
      }

      return existing;
    }

    const rawName = this.clean(dto.primaryContactName);
    if (!rawName) {
      return null;
    }

    const existingByName = await this.companiesRepository.findContactByCompanyAndName(
      tenantId,
      companyId,
      rawName,
    );

    if (existingByName) {
      return existingByName;
    }

    const [firstName, ...rest] = rawName.split(' ');
    return this.companiesRepository.createContact({
      tenant: { connect: { id: tenantId } },
      company: { connect: { id: companyId } },
      firstName,
      lastName: rest.join(' ') || null,
      fullName: rawName,
    });
  }

  private async resolveAssociate(tenantId: string, name?: string, associateId?: string) {
    if (associateId) {
      const associate = await this.companiesRepository.findAssociateById(tenantId, associateId);
      if (!associate) {
        throw new BadRequestException('Associate does not belong to the tenant');
      }

      return associate;
    }

    const cleanedName = this.clean(name);
    if (!cleanedName) {
      return null;
    }

    const normalizedName = this.normalizeName(cleanedName);
    const existing = await this.companiesRepository.findAssociateByNormalizedName(tenantId, normalizedName);
    if (existing) {
      return existing;
    }

    return this.companiesRepository.createAssociate({
      tenant: { connect: { id: tenantId } },
      name: cleanedName,
      normalizedName,
    });
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
      const deal = await this.companiesRepository.findDealById(tenantId, '', dealId);
      workOrderData.actualValue = deal?.value || 0;
    }

    await this.companiesRepository.upsertWorkOrder(dealId, tenantId, workOrderData);
  }

  private mapDeal(deal: any) {
    if (!deal) return null;
    const { workOrder, ...rest } = deal;
    return {
      ...rest,
      companyName: deal.company?.name ?? null,
      value: Number(deal.value),
      stageLabel: this.stageLabel(deal.stage),
      probability: this.getDealProbability(deal.stage),
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
      ...(workOrder ? {
        ...workOrder,
        actualWorkOrderValue: Number(workOrder.actualValue),
        id: deal.id, // Ensure deal ID is primary
      } : {}),
      primaryContact: deal.primaryContact
        ? {
            id: deal.primaryContact.id,
            name: deal.primaryContact.fullName,
            email: deal.primaryContact.email,
            phone: deal.primaryContact.phone,
          }
        : null,
      associate: deal.associate
        ? {
            id: deal.associate.id,
            name: deal.associate.name,
            email: deal.associate.email,
            phone: deal.associate.phone,
          }
        : null,
    };
  }

  private buildCompanyInteractions(company: any) {
    const interactions = [
      ...(company.contacts ?? []).map((contact: any) => ({
        id: `contact-${contact.id}`,
        type: 'system',
        title: 'Contact Added',
        content: `${contact.fullName} was added${contact.title ? ` as ${contact.title}` : ''}.`,
        date: contact.createdAt,
      })),
      ...(company.deals ?? []).flatMap((deal: any) => {
        const events = [
          {
            id: `deal-${deal.id}`,
            type: 'system',
            title: 'Deal Updated',
            content: `${deal.title} is in ${this.stageLabel(deal.stage)} stage.`,
            date: deal.updatedAt,
          },
        ];

        if (deal.sourceLead?.sourceType === LeadSourceType.EMAIL_INQUIRY) {
          events.push({
            id: `lead-email-${deal.sourceLead.id}`,
            type: 'email',
            title: deal.sourceLead.subject || 'Email Inquiry',
            content: deal.sourceLead.messagePreview || `${deal.title} was created from an email inquiry.`,
            date: deal.sourceLead.capturedAt ?? deal.sourceLead.updatedAt ?? deal.updatedAt,
          });
        }

        if (deal.sourceLead?.sourceType === LeadSourceType.WHATSAPP) {
          events.push({
            id: `lead-whatsapp-${deal.sourceLead.id}`,
            type: 'whatsapp',
            title: 'WhatsApp Inquiry',
            content: deal.sourceLead.messagePreview || `${deal.title} was created from a WhatsApp inquiry.`,
            date: deal.sourceLead.capturedAt ?? deal.sourceLead.updatedAt ?? deal.updatedAt,
          });
        }

        return events;
      }),
      {
        id: `company-created-${company.id}`,
        type: 'system',
        title: 'Company Created',
        content: `${company.name} was added to the workspace.`,
        date: company.createdAt,
      },
    ];

    return interactions.sort(
      (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
    );
  }

  private isActiveDeal(stage: DealStage) {
    return stage !== DealStage.CLOSED_WON && stage !== DealStage.NOT_PROGRESSING;
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

  private getDealProbability(stage: DealStage) {
    const probabilities: Record<DealStage, number> = {
      DISCOVERY: 25,
      PROPOSAL: 60,
      NEGOTIATION: 85,
      NOT_PROGRESSING: 0,
      CLOSED_WON: 100,
    };

    return probabilities[stage];
  }

  private clean(value?: string | null) {
    const next = value?.trim();
    return next ? next : undefined;
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }
}
