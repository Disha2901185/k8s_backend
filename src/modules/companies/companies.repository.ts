import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CompaniesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listCompanies(where: Prisma.CompanyWhereInput, skip: number, take: number) {
    return this.prisma.company.findMany({
      where,
      skip,
      take,
      orderBy: { name: 'asc' },
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });
  }

  countCompanies(where: Prisma.CompanyWhereInput) {
    return this.prisma.company.count({ where });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.company.findFirst({
      where: { tenantId, id },
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
        contacts: {
          orderBy: [{ fullName: 'asc' }, { createdAt: 'desc' }],
        },
        deals: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          include: {
            primaryContact: true,
            associate: true,
            sourceLead: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });
  }

  findByNormalizedName(tenantId: string, normalizedName: string) {
    return this.prisma.company.findFirst({
      where: { tenantId, normalizedName },
    });
  }

  create(data: Prisma.CompanyCreateInput) {
    return this.prisma.company.create({
      data,
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });
  }

  update(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({
      where: { id },
      data,
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
        _count: {
          select: {
            contacts: true,
            deals: true,
          },
        },
      },
    });
  }

  delete(id: string) {
    return this.prisma.company.delete({
      where: { id },
    });
  }

  findDealById(tenantId: string, companyId: string, dealId: string) {
    return this.prisma.deal.findFirst({
      where: { tenantId, companyId, id: dealId },
      include: {
        company: true,
        primaryContact: {
          include: {
            company: true,
          },
        },
        associate: true,
        workOrder: true,
      },
    });
  }

  createDeal(data: Prisma.DealCreateInput) {
    return this.prisma.deal.create({
      data,
      include: {
        company: true,
        primaryContact: {
          include: {
            company: true,
          },
        },
        associate: true,
        workOrder: true,
      },
    });
  }

  updateDeal(id: string, data: Prisma.DealUpdateInput) {
    return this.prisma.deal.update({
      where: { id },
      data,
      include: {
        company: true,
        primaryContact: {
          include: {
            company: true,
          },
        },
        associate: true,
        workOrder: true,
      },
    });
  }

  deleteDeal(id: string) {
    return this.prisma.deal.delete({
      where: { id },
    });
  }

  async upsertWorkOrder(
    dealId: string,
    tenantId: string,
    data: Prisma.WorkOrderUncheckedCreateInput,
  ) {
    return this.prisma.workOrder.upsert({
      where: { dealId },
      create: {
        ...data,
        dealId,
        tenantId,
      },
      update: data,
    });
  }

  async deleteWorkOrder(dealId: string) {
    return this.prisma.workOrder.deleteMany({
      where: { dealId },
    });
  }

  findContactById(tenantId: string, id: string) {
    return this.prisma.contact.findFirst({
      where: { tenantId, id },
      include: { company: true },
    });
  }

  findContactByEmail(tenantId: string, email: string) {
    return this.prisma.contact.findFirst({
      where: {
        tenantId,
        email: { equals: email, mode: 'insensitive' },
      },
      include: { company: true },
    });
  }

  findContactByCompanyAndName(tenantId: string, companyId: string, fullName: string) {
    return this.prisma.contact.findFirst({
      where: {
        tenantId,
        companyId,
        fullName: { equals: fullName, mode: 'insensitive' },
      },
      include: { company: true },
    });
  }

  createContact(data: Prisma.ContactCreateInput) {
    return this.prisma.contact.create({
      data,
      include: { company: true },
    });
  }

  updateContact(id: string, data: Prisma.ContactUpdateInput) {
    return this.prisma.contact.update({
      where: { id },
      data,
      include: { company: true },
    });
  }

  findAssociateById(tenantId: string, id: string) {
    return this.prisma.associate.findFirst({
      where: { tenantId, id },
    });
  }

  findAssociateByNormalizedName(tenantId: string, normalizedName: string) {
    return this.prisma.associate.findFirst({
      where: { tenantId, normalizedName },
    });
  }

  createAssociate(data: Prisma.AssociateCreateInput) {
    return this.prisma.associate.create({
      data,
    });
  }

  updateAssociate(id: string, data: Prisma.AssociateUpdateInput) {
    return this.prisma.associate.update({
      where: { id },
      data,
    });
  }

  getDealTotalsByCompanyIds(tenantId: string, companyIds: string[]) {
    if (!companyIds.length) {
      return Promise.resolve([]);
    }

    return this.prisma.deal.groupBy({
      by: ['companyId', 'currency'],
      where: {
        tenantId,
        companyId: { in: companyIds },
      },
      _sum: {
        value: true,
      },
    });
  }
}
