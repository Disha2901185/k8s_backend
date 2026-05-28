import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class DealsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(where: Prisma.DealWhereInput) {
    return this.prisma.deal.findMany({
      where,
      include: {
        company: true,
        primaryContact: true,
        associate: true,
        sourceLead: true,
        workOrder: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
  }

  findById(tenantId: string, id: string) {
    return this.prisma.deal.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        company: true,
        primaryContact: true,
        associate: true,
        sourceLead: true,
        workOrder: true,
      },
    });
  }
  async create(data: Prisma.DealCreateInput) {
    return this.prisma.deal.create({
      data,
      include: {
        company: true,
        primaryContact: true,
        associate: true,
      },
    });
  }

  async updateDeal(id: string, data: Prisma.DealUpdateInput) {
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

  async deleteWorkOrder(dealId: string) {
    return this.prisma.workOrder.deleteMany({
      where: { dealId },
    });
  }

  async findWorkOrderByDealId(dealId: string, tenantId: string) {
    return this.prisma.workOrder.findFirst({
      where: {
        dealId,
        tenantId,
      },
    });
  }

  findTenantItemTypeByNormalizedLabel(tenantId: string, normalizedLabel: string) {
    return this.prisma.tenantItemType.findFirst({
      where: { tenantId, normalizedLabel },
    });
  }

  createTenantItemType(data: Prisma.TenantItemTypeCreateInput) {
    return this.prisma.tenantItemType.create({ data });
  }

  softDelete(id: string) {
    return this.prisma.deal.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });
  }
}
