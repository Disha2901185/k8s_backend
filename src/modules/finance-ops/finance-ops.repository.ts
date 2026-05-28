import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class FinanceOpsRepository {
  constructor(private readonly prisma: PrismaService) {}

  listClients(args: Prisma.CompanyFindManyArgs) {
    return this.prisma.company.findMany(args);
  }

  listTenantItemTypes(tenantId: string) {
    return this.prisma.tenantItemType.findMany({
      where: { tenantId },
      orderBy: [{ label: 'asc' }, { createdAt: 'asc' }],
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

  listTenantHsnSacCodes(tenantId: string) {
    return this.prisma.tenantHsnSacCode.findMany({
      where: { tenantId },
      orderBy: [{ code: 'asc' }, { createdAt: 'asc' }],
    });
  }

  findTenantHsnSacCodeByNormalizedCode(tenantId: string, normalizedCode: string) {
    return this.prisma.tenantHsnSacCode.findFirst({
      where: { tenantId, normalizedCode },
    });
  }

  createTenantHsnSacCode(data: Prisma.TenantHsnSacCodeCreateInput) {
    return this.prisma.tenantHsnSacCode.create({ data });
  }

  countClients(where: Prisma.CompanyWhereInput) {
    return this.prisma.company.count({ where });
  }

  findClientById(tenantId: string, clientId: string) {
    return this.prisma.company.findFirst({
      where: {
        tenantId,
        id: clientId,
      },
      include: {
        primaryContact: true,
        contacts: {
          orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
          take: 5,
        },
      },
    });
  }

  updateClient(id: string, data: Prisma.CompanyUpdateInput) {
    return this.prisma.company.update({
      where: { id },
      data,
      include: {
        primaryContact: true,
      },
    });
  }

  createContact(data: Prisma.ContactCreateInput) {
    return this.prisma.contact.create({ data });
  }

  updateContact(id: string, data: Prisma.ContactUpdateInput) {
    return this.prisma.contact.update({
      where: { id },
      data,
    });
  }

  countClientWorkOrders(where: Prisma.DealWhereInput) {
    return this.prisma.deal.count({ where });
  }

  listClientWorkOrders(args: Prisma.DealFindManyArgs) {
    return this.prisma.deal.findMany(args);
  }

  countAllWorkOrders(where: Prisma.WorkOrderWhereInput) {
    return this.prisma.workOrder.count({ where });
  }

  listAllWorkOrders(args: Prisma.WorkOrderFindManyArgs) {
    return this.prisma.workOrder.findMany(args);
  }

  listCollectionProjectionEntries(args: Prisma.WorkOrderScheduleFindManyArgs) {
    return this.prisma.workOrderSchedule.findMany(args);
  }

  findWorkOrderById(tenantId: string, workOrderId: string) {
    return this.prisma.workOrder.findFirst({
      where: {
        tenantId,
        id: workOrderId,
      },
      include: {
        deal: {
          include: {
            company: {
              include: {
                primaryContact: true,
              },
            },
          },
        },
      },
    });
  }

  createDeal(data: Prisma.DealCreateInput) {
    return this.prisma.deal.create({
      data,
      include: {
        company: true,
        primaryContact: true,
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
        primaryContact: true,
        workOrder: true,
      },
    });
  }

  createWorkOrder(data: Prisma.WorkOrderCreateInput) {
    return this.prisma.workOrder.create({
      data,
      include: {
        deal: {
          include: {
            company: {
              include: {
                primaryContact: true,
              },
            },
          },
        },
      },
    });
  }

  updateWorkOrder(id: string, data: Prisma.WorkOrderUpdateInput) {
    return this.prisma.workOrder.update({
      where: { id },
      data,
      include: {
        deal: {
          include: {
            company: {
              include: {
                primaryContact: true,
              },
            },
          },
        },
      },
    });
  }

  async deleteWorkOrder(id: string) {
    const workOrder = await this.prisma.workOrder.delete({
      where: { id },
    });

    if (workOrder.dealId) {
      await this.prisma.deal.update({
        where: { id: workOrder.dealId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });
    }

    return workOrder;
  }

  countItems(where: Prisma.WorkOrderItemWhereInput) {
    return this.prisma.workOrderItem.count({ where });
  }

  listItems(args: Prisma.WorkOrderItemFindManyArgs) {
    return this.prisma.workOrderItem.findMany(args);
  }

  findItemById(tenantId: string, workOrderId: string, itemId: string) {
    return this.prisma.workOrderItem.findFirst({
      where: { tenantId, workOrderId, id: itemId },
    });
  }

  listItemOptions(tenantId: string, workOrderId: string) {
    return this.prisma.workOrderItem.findMany({
      where: { tenantId, workOrderId },
      orderBy: [{ itemDetails: 'asc' }, { createdAt: 'asc' }],
    });
  }

  listItemsByIds(tenantId: string, workOrderId: string, itemIds: string[]) {
    return this.prisma.workOrderItem.findMany({
      where: {
        tenantId,
        workOrderId,
        id: { in: itemIds },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  createItem(data: Prisma.WorkOrderItemCreateInput) {
    return this.prisma.workOrderItem.create({ data });
  }

  updateItem(id: string, data: Prisma.WorkOrderItemUpdateInput) {
    return this.prisma.workOrderItem.update({
      where: { id },
      data,
    });
  }

  deleteItem(id: string) {
    return this.prisma.workOrderItem.delete({
      where: { id },
    });
  }

  countSchedules(where: Prisma.WorkOrderScheduleWhereInput) {
    return this.prisma.workOrderSchedule.count({ where });
  }

  listSchedules(args: Prisma.WorkOrderScheduleFindManyArgs) {
    return this.prisma.workOrderSchedule.findMany(args);
  }

  findScheduleById(tenantId: string, workOrderId: string, scheduleId: string) {
    return this.prisma.workOrderSchedule.findFirst({
      where: { tenantId, workOrderId, id: scheduleId },
      include: {
        workOrderItem: true,
      },
    });
  }

  createSchedule(data: Prisma.WorkOrderScheduleCreateInput) {
    return this.prisma.workOrderSchedule.create({
      data,
      include: {
        workOrderItem: true,
      },
    });
  }

  updateSchedule(id: string, data: Prisma.WorkOrderScheduleUpdateInput) {
    return this.prisma.workOrderSchedule.update({
      where: { id },
      data,
      include: {
        workOrderItem: true,
      },
    });
  }

  deleteSchedule(id: string) {
    return this.prisma.workOrderSchedule.delete({
      where: { id },
    });
  }

  deleteSchedulesByItemIds(tenantId: string, workOrderId: string, itemIds: string[]) {
    return this.prisma.workOrderSchedule.deleteMany({
      where: {
        tenantId,
        workOrderId,
        workOrderItemId: { in: itemIds },
      },
    });
  }

  createManySchedules(data: Prisma.WorkOrderScheduleCreateManyInput[]) {
    return this.prisma.workOrderSchedule.createMany({ data });
  }

  countInvoices(where: Prisma.WorkOrderInvoiceWhereInput) {
    return this.prisma.workOrderInvoice.count({ where });
  }

  listInvoices(args: Prisma.WorkOrderInvoiceFindManyArgs) {
    return this.prisma.workOrderInvoice.findMany(args);
  }

  findInvoiceById(tenantId: string, workOrderId: string, invoiceId: string) {
    return this.prisma.workOrderInvoice.findFirst({
      where: { tenantId, workOrderId, id: invoiceId },
      include: {
        receipt: true,
        invoiceItems: {
          include: {
            schedule: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }

  findInvoiceByNumber(tenantId: string, invoiceNo: string, excludeId?: string) {
    return this.prisma.workOrderInvoice.findFirst({
      where: {
        tenantId,
        invoiceNo,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
  }

  listTenantInvoiceNumbers(tenantId: string) {
    return this.prisma.workOrderInvoice.findMany({
      where: { tenantId },
      select: { invoiceNo: true },
      orderBy: [{ createdAt: 'desc' }],
      take: 500,
    });
  }

  createInvoice(data: Prisma.WorkOrderInvoiceCreateInput) {
    return this.prisma.workOrderInvoice.create({
      data,
      include: {
        receipt: true,
      },
    });
  }

  updateInvoice(id: string, data: Prisma.WorkOrderInvoiceUpdateInput) {
    return this.prisma.workOrderInvoice.update({
      where: { id },
      data,
      include: {
        receipt: true,
      },
    });
  }

  deleteInvoice(id: string) {
    return this.prisma.workOrderInvoice.delete({
      where: { id },
    });
  }

  countReceipts(where: Prisma.WorkOrderReceiptWhereInput) {
    return this.prisma.workOrderReceipt.count({ where });
  }

  listReceipts(args: Prisma.WorkOrderReceiptFindManyArgs) {
    return this.prisma.workOrderReceipt.findMany(args);
  }

  countAllReceipts(where: Prisma.WorkOrderReceiptWhereInput) {
    return this.prisma.workOrderReceipt.count({ where });
  }

  listAllReceipts(args: Prisma.WorkOrderReceiptFindManyArgs) {
    return this.prisma.workOrderReceipt.findMany(args);
  }

  findReceiptById(tenantId: string, workOrderId: string, receiptId: string) {
    return this.prisma.workOrderReceipt.findFirst({
      where: { tenantId, workOrderId, id: receiptId },
      include: {
        invoice: true,
      },
    });
  }

  createReceipt(data: Prisma.WorkOrderReceiptCreateInput) {
    return this.prisma.workOrderReceipt.create({
      data,
      include: {
        invoice: true,
      },
    });
  }

  updateReceipt(id: string, data: Prisma.WorkOrderReceiptUpdateInput) {
    return this.prisma.workOrderReceipt.update({
      where: { id },
      data,
      include: {
        invoice: true,
      },
    });
  }

  deleteReceipt(id: string) {
    return this.prisma.workOrderReceipt.delete({
      where: { id },
    });
  }

  async deleteClientFinanceProjection(tenantId: string, companyId: string) {
    return this.prisma.$transaction(async (tx) => {
      const deals = await tx.deal.findMany({
        where: {
          tenantId,
          companyId,
          isDeleted: false,
          stage: 'CLOSED_WON',
          workOrder: {
            isNot: null,
          },
        },
        include: {
          workOrder: true,
        },
      });

      const dealIds = deals.map((deal) => deal.id);
      const workOrderIds = deals.map((deal) => deal.workOrder?.id).filter(Boolean) as string[];

      if (workOrderIds.length) {
        await tx.workOrderReceipt.deleteMany({ where: { tenantId, workOrderId: { in: workOrderIds } } });
        await tx.workOrderInvoice.deleteMany({ where: { tenantId, workOrderId: { in: workOrderIds } } });
        await tx.workOrderSchedule.deleteMany({ where: { tenantId, workOrderId: { in: workOrderIds } } });
        await tx.workOrderItem.deleteMany({ where: { tenantId, workOrderId: { in: workOrderIds } } });
        await tx.workOrder.deleteMany({ where: { tenantId, id: { in: workOrderIds } } });
      }

      if (dealIds.length) {
        await tx.deal.deleteMany({ where: { id: { in: dealIds }, tenantId } });
      }

      return tx.company.update({
        where: { id: companyId },
        data: { status: 'Prospect' },
        include: { primaryContact: true },
      });
    });
  }
}
