import { Injectable, NotFoundException } from '@nestjs/common';
import { DealsRepository } from './deals.repository';

@Injectable()
export class DealsService {
  constructor(private readonly dealsRepository: DealsRepository) {}

  async listDeals(tenantId: string) {
    const deals = await this.dealsRepository.findMany({ tenantId, isDeleted: false });
    return deals.map((d) => this.mapDeal(d));
  }

  async getDeal(tenantId: string, id: string) {
    const deal = await this.dealsRepository.findById(tenantId, id);
    if (!deal || deal.isDeleted) {
      throw new NotFoundException('Deal not found');
    }
    return this.mapDeal(deal);
  }

  async getWorkOrder(tenantId: string, dealId: string) {
    const workOrder = await this.dealsRepository.findWorkOrderByDealId(dealId, tenantId);
    if (!workOrder) {
      throw new NotFoundException('Work order not found for this deal');
    }
    return {
      ...workOrder,
      actualValue: Number(workOrder.actualValue),
      actualWorkOrderValue: Number(workOrder.actualValue),
    };
  }

  async deleteDeal(tenantId: string, id: string) {
    await this.getDeal(tenantId, id);
    await this.dealsRepository.softDelete(id);
    return { success: true };
  }

  async createDeal(tenantId: string, dto: any) {
    const data: any = {
      tenant: { connect: { id: tenantId } },
      title: dto.title,
      description: dto.description,
      currency: dto.currency,
      value: dto.value,
      stage: dto.stage,
      associateSuccessFee: dto.associateSuccessFee,
    };

    if (dto.companyId) {
      data.company = { connect: { id: dto.companyId } };
    }

    if (dto.primaryContactId) {
      data.primaryContact = { connect: { id: dto.primaryContactId } };
    }

    if (dto.associateId) {
      data.associate = { connect: { id: dto.associateId } };
    }

    const deal = await this.dealsRepository.create(data);

    // If a deal is created directly as CLOSED_WON, handle work order
    if (dto.stage === 'CLOSED_WON') {
      await this.handleWorkOrderUpsert(deal.id, tenantId, dto);
    }

    return this.mapDeal(deal);
  }

  async updateDeal(tenantId: string, id: string, dto: any) {
    await this.getDeal(tenantId, id);
    const data: any = {
      title: dto.title,
      description: dto.description,
      currency: dto.currency,
      value: dto.value,
      stage: dto.stage,
      associateSuccessFee: dto.associateSuccessFee,
    };

    if (dto.companyId) {
      data.company = { connect: { id: dto.companyId } };
    } else if (dto.companyId === null) {
      data.company = { disconnect: true };
    }

    if (dto.primaryContactId) {
      data.primaryContact = { connect: { id: dto.primaryContactId } };
    } else if (dto.primaryContactId === null) {
      data.primaryContact = { disconnect: true };
    }

    if (dto.associateId) {
      data.associate = { connect: { id: dto.associateId } };
    } else if (dto.associateId === null) {
      data.associate = { disconnect: true };
    }

    const deal = await this.dealsRepository.updateDeal(id, data);
    
    if (dto.stage) {
      if (dto.stage === 'CLOSED_WON') {
        await this.handleWorkOrderUpsert(id, tenantId, dto);
      } else {
        await this.dealsRepository.deleteWorkOrder(id);
      }
    }

    // Refetch deal to get updated workOrder relation if needed, 
    // or just rely on the repository's include if it worked during update.
    const updatedDeal = await this.dealsRepository.findById(tenantId, id);
    return this.mapDeal(updatedDeal);
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
    if (dto.projectType !== undefined) {
      workOrderData.projectType = dto.projectType;
      const cleanedProjectType = this.clean(dto.projectType);
      if (cleanedProjectType) {
        await this.ensureTenantItemType(tenantId, cleanedProjectType);
      }
    }
    if (dto.poNumber !== undefined) workOrderData.poNumber = dto.poNumber;
    if (dto.poDate !== undefined) workOrderData.poDate = dto.poDate ? new Date(dto.poDate) : null;
    if (dto.poEndDate !== undefined) workOrderData.poEndDate = dto.poEndDate ? new Date(dto.poEndDate) : null;
    if (dto.poDocumentUrl !== undefined) workOrderData.poDocumentUrl = dto.poDocumentUrl;
    if (dto.duration !== undefined) workOrderData.duration = dto.duration;

    // Ensure actualValue is present for creation if not provided but deal is CLOSED_WON
    if (workOrderData.actualValue === undefined) {
      const deal = await this.dealsRepository.findById(tenantId, dealId);
      workOrderData.actualValue = deal?.value || 0;
    }

    await this.dealsRepository.upsertWorkOrder(dealId, tenantId, workOrderData);
  }

  private async ensureTenantItemType(tenantId: string, label: string) {
    const normalizedLabel = this.normalizeName(label);
    if (!normalizedLabel) return null;
    const existing = await this.dealsRepository.findTenantItemTypeByNormalizedLabel(tenantId, normalizedLabel);
    if (existing) {
      return existing;
    }

    return this.dealsRepository.createTenantItemType({
      tenant: { connect: { id: tenantId } },
      label,
      normalizedLabel,
    });
  }

  private clean(value?: string | null) {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized.length ? normalized : undefined;
  }

  private normalizeName(value: string) {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s+/\-]/g, '');
  }

  private mapDeal(deal: any) {
    if (!deal) return null;
    const { workOrder, ...rest } = deal;
    return {
      ...rest,
      value: Number(deal.value),
      associateSuccessFee: deal.associateSuccessFee ? Number(deal.associateSuccessFee) : null,
      ...(workOrder ? {
        ...workOrder,
        actualWorkOrderValue: Number(workOrder.actualValue),
        // Ensure the nested ID doesn't overwrite the Deal ID
        id: deal.id,
      } : {}),
    };
  }
}
