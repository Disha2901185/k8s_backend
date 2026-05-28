import { Injectable } from '@nestjs/common';
import { LeadSourceType, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LeadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCredentialByClientId(clientId: string) {
    return this.prisma.tenantLeadCredential.findUnique({ where: { clientId } });
  }

  findLeadBySourceIdentity(
    tenantId: string,
    sourceType: LeadSourceType,
    externalSourceId: string,
  ) {
    return this.prisma.lead.findFirst({
      where: {
        tenantId,
        isDeleted: false,
        sourceType,
        externalSourceId,
      },
      include: {
        company: true,
        convertedContact: true,
        convertedDeal: {
          include: {
            workOrder: true,
          },
        },
      },
    });
  }

  createLead(data: Prisma.LeadCreateInput) {
    return this.prisma.lead.create({
      data,
      include: {
        company: true,
        convertedContact: true,
        convertedDeal: true,
      },
    });
  }

  updateLead(id: string, data: Prisma.LeadUpdateInput) {
    return this.prisma.lead.update({
      where: { id },
      data,
      include: {
        company: true,
        convertedContact: true,
        convertedDeal: true,
      },
    });
  }

  findLeadById(tenantId: string, id: string) {
    return this.prisma.lead.findFirst({
      where: {
        tenantId,
        id,
        isDeleted: false,
      },
      include: {
        company: true,
        convertedContact: {
          include: {
            company: true,
          },
        },
        convertedDeal: {
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
        },
      },
    });
  }

  listLeads(
    where: Prisma.LeadWhereInput,
    skip: number,
    take: number,
    sortField?: string,
    sortOrder?: 'ASC' | 'DESC',
  ) {
    const orderBy: Prisma.LeadOrderByWithRelationInput[] = [];

    if (sortField) {
      orderBy.push({
        [sortField]: sortOrder?.toLowerCase() || 'desc',
      });
    }

    // Secondary default sort to ensure stable pagination
    orderBy.push({ capturedAt: 'desc' });
    orderBy.push({ createdAt: 'desc' });

    return this.prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        company: true,
        convertedContact: {
          include: {
            company: true,
          },
        },
        convertedDeal: {
          include: {
            workOrder: true,
          },
        },
      },
    });
  }

  countLeads(where: Prisma.LeadWhereInput) {
    return this.prisma.lead.count({ where });
  }

  softDeleteLead(id: string) {
    return this.prisma.lead.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }

  listCompanies(tenantId: string, search?: string, take = 20) {
    return this.prisma.company.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { website: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take,
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

  findCompanyById(tenantId: string, id: string) {
    return this.prisma.company.findFirst({
      where: { tenantId, id },
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  findCompanyByNormalizedName(tenantId: string, normalizedName: string) {
    return this.prisma.company.findFirst({
      where: { tenantId, normalizedName },
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  createCompany(data: Prisma.CompanyCreateInput) {
    return this.prisma.company.create({
      data,
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  updateCompany(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({
      where: { id },
      data,
      include: {
        primaryContact: {
          include: {
            company: true,
          },
        },
      },
    });
  }

  listContacts(
    tenantId: string,
    companyId?: string,
    companyName?: string,
    search?: string,
    take = 20,
  ) {
    return this.prisma.contact.findMany({
      where: {
        tenantId,
        ...(companyId ? { companyId } : {}),
        ...(companyName
          ? {
              company: {
                name: {
                  equals: companyName,
                  mode: 'insensitive',
                },
              },
            }
          : {}),
        ...(search
          ? {
              OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { company: true },
      orderBy: { fullName: 'asc' },
      take,
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

  findContactByCompanyAndName(tenantId: string, companyId: string | undefined, fullName: string) {
    return this.prisma.contact.findFirst({
      where: {
        tenantId,
        ...(companyId ? { companyId } : {}),
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

  listAssociates(tenantId: string, search?: string, take = 20) {
    return this.prisma.associate.findMany({
      where: {
        tenantId,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { name: 'asc' },
      take,
      include: {
        _count: {
          select: {
            deals: true,
          },
        },
      },
    });
  }

  findAssociateById(tenantId: string, id: string) {
    return this.prisma.associate.findFirst({ where: { tenantId, id } });
  }

  findAssociateByNormalizedName(tenantId: string, normalizedName: string) {
    return this.prisma.associate.findFirst({ where: { tenantId, normalizedName } });
  }

  createAssociate(data: Prisma.AssociateCreateInput) {
    return this.prisma.associate.create({ data });
  }

  updateAssociate(id: string, data: Prisma.AssociateUpdateInput) {
    return this.prisma.associate.update({ where: { id }, data });
  }

  findDealBySourceLeadId(sourceLeadId: string) {
    return this.prisma.deal.findFirst({
      where: { sourceLeadId },
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
}
