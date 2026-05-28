import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AutoGenerateWorkOrderSchedulesDto,
  CreateHsnSacCodeDto,
  CreateWorkOrderDto,
  ListClientWorkOrdersQueryDto,
  ListClientsQueryDto,
  ListCollectionProjectionQueryDto,
  ListWorkOrderInvoicesQueryDto,
  ListAllWorkOrdersQueryDto,
  ListAllInvoicesQueryDto,
  ListWorkOrderItemsQueryDto,
  ListWorkOrderReceiptsQueryDto,
  ListAllReceiptsQueryDto,
  ListWorkOrderSchedulesQueryDto,
  SaveWorkOrderInvoiceDto,
  SaveWorkOrderItemDto,
  SaveWorkOrderReceiptDto,
  SaveWorkOrderScheduleDto,
  UpdateClientDto,
  UpdateWorkOrderDto,
  GetDashboardKpiQueryDto,
} from 'src/modules/finance-ops/finance-ops.dto';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { notifyProductionError } from 'src/common/utils/error-email.helper';
import { getDefaultItemTypes } from 'src/modules/finance-ops/item-type-defaults';
import { FinanceOpsRepository } from 'src/modules/finance-ops/finance-ops.repository';
import { PrismaService } from 'src/prisma/prisma.service';

const path = require('path');
const fs = require('fs');
const appConstants = require(path.join(process.cwd(), 'constant.js'));

@Injectable()
export class FinanceOpsService {
  private readonly constantsPath = path.join(process.cwd(), 'constant.js');
  private readonly ratesRefreshIntervalMs = 6 * 60 * 60 * 1000;

  constructor(
    private readonly repository: FinanceOpsRepository,
    private readonly prisma: PrismaService,
  ) { }

  private getRecordCurrency(record: any): string {
    const currency =
      record.workOrder?.deal?.currency ??
      record.deal?.currency ??
      record.workOrder?.deal?.company?.currency ??
      record.deal?.company?.currency ??
      'INR';
    return currency.toUpperCase();
  }

  private calculatePeriods(range?: string, fromDateStr?: string, toDateStr?: string) {
    const now = new Date();
    
    let currentStart: Date;
    let currentEnd: Date;
    let previousStart: Date;
    let previousEnd: Date;

    const r = range || 'thisMonth';

    switch (r) {
      case 'select':
      case 'thisMonth': {
        currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        
        previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
        previousEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        break;
      }
      case 'lastMonth': {
        currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
        currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        
        previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1, 0, 0, 0, 0));
        previousEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 0, 23, 59, 59, 999));
        break;
      }
      case 'thisQuarter': {
        const currentQuarter = Math.floor(now.getUTCMonth() / 3);
        currentStart = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 1, 0, 0, 0, 0));
        currentEnd = new Date(Date.UTC(now.getUTCFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999));
        
        previousStart = new Date(Date.UTC(now.getUTCFullYear(), (currentQuarter - 1) * 3, 1, 0, 0, 0, 0));
        previousEnd = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 0, 23, 59, 59, 999));
        break;
      }
      case 'lastQuarter': {
        const currentQuarter = Math.floor(now.getUTCMonth() / 3);
        currentStart = new Date(Date.UTC(now.getUTCFullYear(), (currentQuarter - 1) * 3, 1, 0, 0, 0, 0));
        currentEnd = new Date(Date.UTC(now.getUTCFullYear(), currentQuarter * 3, 0, 23, 59, 59, 999));
        
        previousStart = new Date(Date.UTC(now.getUTCFullYear(), (currentQuarter - 2) * 3, 1, 0, 0, 0, 0));
        previousEnd = new Date(Date.UTC(now.getUTCFullYear(), (currentQuarter - 1) * 3, 0, 23, 59, 59, 999));
        break;
      }
      case 'thisFinYear': {
        let finYearStartYear = now.getUTCFullYear();
        if (now.getUTCMonth() < 3) {
          finYearStartYear -= 1;
        }
        currentStart = new Date(Date.UTC(finYearStartYear, 3, 1, 0, 0, 0, 0));
        currentEnd = new Date(Date.UTC(finYearStartYear + 1, 3, 0, 23, 59, 59, 999));
        
        previousStart = new Date(Date.UTC(finYearStartYear - 1, 3, 1, 0, 0, 0, 0));
        previousEnd = new Date(Date.UTC(finYearStartYear, 3, 0, 23, 59, 59, 999));
        break;
      }
      case 'custom': {
        const from = fromDateStr ? new Date(fromDateStr) : new Date();
        const to = toDateStr ? new Date(toDateStr) : new Date();
        
        currentStart = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0, 0));
        currentEnd = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999));
        
        const diffMs = currentEnd.getTime() - currentStart.getTime();
        previousEnd = new Date(currentStart.getTime() - 1);
        previousStart = new Date(previousEnd.getTime() - diffMs);
        break;
      }
      default: {
        currentStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
        currentEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        
        previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
        previousEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        break;
      }
    }

    return {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd }
    };
  }

  async getDashboardKpis(tenantId: string, query: GetDashboardKpiQueryDto) {
    const { range, fromDate, toDate } = query;
    const periods = this.calculatePeriods(range, fromDate, toDate);
    const { current, previous } = periods;

    // 1. Fetch Current Range Records
    const [
      currentWorkOrders,
      currentReceipts,
      currentInvoices,
    ] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { tenantId, createdAt: { gte: current.start, lte: current.end } },
        include: { deal: { include: { company: true } } }
      }),
      this.prisma.workOrderReceipt.findMany({
        where: { tenantId, receiptDate: { gte: current.start, lte: current.end } },
        include: { workOrder: { include: { deal: { include: { company: true } } } } }
      }),
      this.prisma.workOrderInvoice.findMany({
        where: { tenantId, invoiceDate: { gte: current.start, lte: current.end } },
        include: { workOrder: { include: { deal: { include: { company: true } } } } }
      }),
    ]);

    // 2. Fetch Previous Range Records for trend calculation
    const [
      prevWorkOrders,
      prevReceipts,
      prevInvoices,
    ] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: { tenantId, createdAt: { gte: previous.start, lte: previous.end } },
        include: { deal: { include: { company: true } } }
      }),
      this.prisma.workOrderReceipt.findMany({
        where: { tenantId, receiptDate: { gte: previous.start, lte: previous.end } },
        include: { workOrder: { include: { deal: { include: { company: true } } } } }
      }),
      this.prisma.workOrderInvoice.findMany({
        where: { tenantId, invoiceDate: { gte: previous.start, lte: previous.end } },
        include: { workOrder: { include: { deal: { include: { company: true } } } } }
      }),
    ]);

    // 3. Compute Current Values in INR
    const currentOrdersCount = currentWorkOrders.length;
    
    let currentCollectionInr = 0;
    for (const r of currentReceipts) {
      const currency = this.getRecordCurrency(r);
      const rate = await this.getInrConversionRate(currency);
      currentCollectionInr += Number(r.amountReceived || 0) * rate;
    }

    let currentBillingInr = 0;
    for (const inv of currentInvoices) {
      currentBillingInr += Number(inv.inrTotalAmount || 0);
    }

    let currentOrderValueInr = 0;
    for (const wo of currentWorkOrders) {
      const currency = this.getRecordCurrency(wo);
      const rate = await this.getInrConversionRate(currency);
      currentOrderValueInr += Number(wo.actualValue || 0) * rate;
    }

    // 4. Compute Previous Values in INR
    const prevOrdersCount = prevWorkOrders.length;

    let prevCollectionInr = 0;
    for (const r of prevReceipts) {
      const currency = this.getRecordCurrency(r);
      const rate = await this.getInrConversionRate(currency);
      prevCollectionInr += Number(r.amountReceived || 0) * rate;
    }

    let prevBillingInr = 0;
    for (const inv of prevInvoices) {
      prevBillingInr += Number(inv.inrTotalAmount || 0);
    }

    let prevOrderValueInr = 0;
    for (const wo of prevWorkOrders) {
      const currency = this.getRecordCurrency(wo);
      const rate = await this.getInrConversionRate(currency);
      prevOrderValueInr += Number(wo.actualValue || 0) * rate;
    }

    // 5. Helper function for Trend calculation
    const calculateTrend = (curr: number, prev: number) => {
      if (prev === 0) {
        return {
          trend: curr > 0 ? '100%' : '0%',
          trendUp: curr >= 0,
        };
      }
      const percent = ((curr - prev) / prev) * 100;
      return {
        trend: Math.abs(Math.round(percent)) + '%',
        trendUp: percent >= 0,
      };
    };

    const ordersTrend = calculateTrend(currentOrdersCount, prevOrdersCount);
    const collectionTrend = calculateTrend(currentCollectionInr, prevCollectionInr);
    const billingTrend = calculateTrend(currentBillingInr, prevBillingInr);
    const orderValueTrend = calculateTrend(currentOrderValueInr, prevOrderValueInr);

    // 6. Build final KPI cards list
    const rangeLabel = range === 'custom' ? 'selected range' : (range === 'lastMonth' ? 'last month' : (range === 'thisQuarter' ? 'this quarter' : (range === 'lastQuarter' ? 'last quarter' : (range === 'thisFinYear' ? 'this financial year' : 'this month'))));

    return [
      {
        title: 'New Orders',
        value: currentOrdersCount.toString(),
        trend: range === 'select' ? null : ordersTrend.trend,
        trendUp: range === 'select' ? true : ordersTrend.trendUp,
        description: `Orders created ${rangeLabel}`,
      },
      {
        title: 'Collection',
        value: Math.round(currentCollectionInr).toString(),
        trend: range === 'select' ? null : collectionTrend.trend,
        trendUp: range === 'select' ? true : collectionTrend.trendUp,
        description: `Payments received ${rangeLabel} (INR)`,
      },
      {
        title: 'Billing',
        value: Number(currentBillingInr.toFixed(2)).toString(),
        trend: range === 'select' ? null : billingTrend.trend,
        trendUp: range === 'select' ? true : billingTrend.trendUp,
        description: `Invoices billed ${rangeLabel} (INR)`,
      },
      {
        title: 'Order Value',
        value: Math.round(currentOrderValueInr).toString(),
        trend: range === 'select' ? null : orderValueTrend.trend,
        trendUp: range === 'select' ? true : orderValueTrend.trendUp,
        description: `Total order value ${rangeLabel} (INR)`,
      },
    ];
  }

  async listClients(tenantId: string, query: ListClientsQueryDto) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const search = this.clean(query.search);

    const where: Prisma.CompanyWhereInput = {
      tenantId,
      deals: {
        some: {
          tenantId,
          isDeleted: false,
          stage: 'CLOSED_WON',
          workOrder: {
            isNot: null,
          },
        },
      },
      ...(search
        ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
            { taxId: { contains: search, mode: 'insensitive' } },
            { primaryContact: { fullName: { contains: search, mode: 'insensitive' } } },
            { primaryContact: { email: { contains: search, mode: 'insensitive' } } },
          ],
        }
        : {}),
    };

    const orderBy = this.getClientOrderBy(query.sortBy, query.sortDirection);

    const [items, total] = await Promise.all([
      this.repository.listClients({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
        include: {
          primaryContact: true,
          deals: {
            where: {
              tenantId,
              isDeleted: false,
              stage: 'CLOSED_WON',
              workOrder: {
                isNot: null,
              },
            },
            include: {
              workOrder: true,
            },
          },
        },
      }),
      this.repository.countClients(where),
    ]);

    return {
      items: items.map((client) => this.mapClient(client)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async getOrderFormOptions(tenantId: string, selectedClientId?: string) {
    const clients = await this.repository.listClients({
      where: {
        tenantId,
        deals: {
          some: {
            tenantId,
            isDeleted: false,
            stage: 'CLOSED_WON',
            workOrder: {
              isNot: null,
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      include: {
        primaryContact: true,
      },
    });

    const selectedClient = selectedClientId
      ? clients.find((client) => client.id === selectedClientId) ?? null
      : null;

    return {
      clients: clients.map((client) => ({
        id: client.id,
        label: client.name,
        value: client.id,
        currency: client.currency ?? 'INR',
        paymentTerms: client.paymentTerms ?? '',
      })),
      selectedClient: selectedClient ? this.mapClient(selectedClient) : null,
      projectTypes: ['Fixed Bid', 'T&M', 'Retainer'],
      billingFrequencies: ['One-time', 'Monthly', 'Quarterly', 'Annually'],
      paymentModes: ['Bank Remittance', 'Bank Transfer', 'UPI', 'Cheque', 'Cash'],
    };
  }

  async getItemTypeOptions(tenantId: string) {
    const itemTypes = await this.repository.listTenantItemTypes(tenantId);
    const merged = new Map<string, string>();

    for (const label of getDefaultItemTypes()) {
      const normalized = this.normalizeName(label);
      if (normalized) {
        merged.set(normalized, label);
      }
    }

    for (const itemType of itemTypes) {
      merged.set(itemType.normalizedLabel, itemType.label);
    }

    return Array.from(merged.values());
  }

  async getClientDetails(tenantId: string, clientId: string, query: ListClientWorkOrdersQueryDto) {
    const client = await this.requireClient(tenantId, clientId);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const search = this.clean(query.search);

    let orConditions: Prisma.DealWhereInput[] = [];
    if (search) {
      orConditions = [
        { title: { contains: search, mode: 'insensitive' } },
        { workOrder: { is: { poNumber: { contains: search, mode: 'insensitive' } } } },
        { workOrder: { is: { duration: { contains: search, mode: 'insensitive' } } } },
      ];

      const dateRange = this.parseSearchToDateRange(search);
      if (dateRange) {
        orConditions.push({ workOrder: { is: { poDate: dateRange } } });
      }
    }

    const where: Prisma.DealWhereInput = {
      tenantId,
      companyId: clientId,
      isDeleted: false,
      stage: 'CLOSED_WON',
      workOrder: {
        isNot: null,
      },
      ...(search ? { OR: orConditions } : {}),
    };

    const [workOrders, total] = await Promise.all([
      this.repository.listClientWorkOrders({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.getWorkOrderOrderBy(query.sortBy, query.sortDirection),
        include: {
          workOrder: true,
        },
      }),
      this.repository.countClientWorkOrders(where),
    ]);

    return {
      client: this.mapClient(client),
      workOrders: workOrders.map((deal: any) => this.mapWorkOrderSummary(deal.workOrder, deal)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async listAllWorkOrders(tenantId: string, query: ListAllWorkOrdersQueryDto) {
    try {
      const page = Number(query.page || 1);
      const limit = Number(query.limit || 10);
      const search = this.clean(query.search);

      let orConditions: Prisma.WorkOrderWhereInput[] = [];
      if (search) {
        orConditions = [
          { deal: { title: { contains: search, mode: 'insensitive' } } },
          { deal: { company: { name: { contains: search, mode: 'insensitive' } } } },
          { poNumber: { contains: search, mode: 'insensitive' } },
        ];

        const dateRange = this.parseSearchToDateRange(search);
        if (dateRange) {
          orConditions.push({ poDate: dateRange });
        }
      }

      const where: Prisma.WorkOrderWhereInput = {
        tenantId,
        ...(search ? { OR: orConditions } : {}),
      };

      if (query.range && query.range !== 'all') {
        const periods = this.calculatePeriods(query.range, query.fromDate, query.toDate);
        where.createdAt = { gte: periods.current.start, lte: periods.current.end };
      }

      const orderBy = this.getWorkOrderOrderByForWorkOrderTable(query.sortBy, query.sortDirection);

      const [items, total] = await Promise.all([
        this.repository.listAllWorkOrders({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
          include: {
            deal: {
              include: {
                company: true,
              },
            },
            items: true,
          },
        }),
        this.repository.countAllWorkOrders(where),
      ]);

      const constants = this.loadAppConstants();
      return {
        items: items.map((wo: any) => ({
          id: wo.id,
          project: wo.deal?.title ?? '',
          client: wo.deal?.company?.name ?? '',
          clientId: wo.deal?.company?.id ?? '',
          value: Number(wo.actualValue ?? 0),
          currency: wo.deal?.currency ?? wo.deal?.company?.currency ?? 'INR',
          date: this.toDateInput(wo.poDate),
          poExpiry: this.toDateInput(wo.poEndDate),
          startDate: this.toDateInput(wo.startDate),
          endDate: this.toDateInput(wo.endDate),
          poNumber: wo.poNumber ?? '',
          projectType: wo.projectType ?? 'Other',
          orderItems: (wo.items ?? []).map((item: any) => ({
            id: item.id,
            itemType: item.itemType,
            amount: Number(item.itemAmount ?? 0),
          })),
          duration: wo.duration || this.buildDurationFromDates(wo.startDate, wo.endDate),
        })),
        itemTypes: constants?.ITEM_TYPES ?? [],
        currencyRates: constants?.CURRENCY_RATES ?? {
          USD: 1,
          INR: 96.6491,
          EUR: 0.8612,
          GBP: 0.7463,
          AED: 3.6725
        },
        pagination: this.buildPagination(page, limit, total),
      };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.listAllWorkOrders',
        error: err,
        context: { tenantId, query },
      });
      throw err;
    }
  }

  async listCollectionProjection(tenantId: string, query: ListCollectionProjectionQueryDto) {
    const selectedMonth = query.month ?? this.toMonthInput(new Date());
    const monthStart = new Date(`${selectedMonth}-01T00:00:00.000Z`);
    if (Number.isNaN(monthStart.getTime())) {
      throw new BadRequestException('Invalid month format. Use YYYY-MM');
    }

    const nextMonthStart = new Date(monthStart);
    nextMonthStart.setUTCMonth(nextMonthStart.getUTCMonth() + 1);

    const items = await this.repository.listCollectionProjectionEntries({
      where: {
        tenantId,
        scheduleDate: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
      include: {
        workOrder: {
          include: {
            deal: {
              include: {
                company: true,
              },
            },
          },
        },
      },
      orderBy: [{ scheduleDate: 'asc' }, { createdAt: 'asc' }],
    });

    const conversionRateByCurrency = new Map<string, number>();
    const rows = await Promise.all(items.map(async (item: any) => {
      const amount = Number(item.amount ?? 0);
      const currency = (
        item.workOrder?.deal?.currency ??
        item.workOrder?.deal?.company?.currency ??
        'INR'
      ).toUpperCase();

      if (!conversionRateByCurrency.has(currency)) {
        conversionRateByCurrency.set(currency, await this.getInrConversionRate(currency));
      }

      const conversionRate = conversionRateByCurrency.get(currency) ?? 1;
      const inrAmount = amount * conversionRate;

      return {
        scheduleDate: this.toDateInput(item.scheduleDate),
        customerName: item.workOrder?.deal?.company?.name ?? '',
        projectName: item.workOrder?.deal?.title ?? '',
        amount,
        currency,
        inrAmount,
      };
    }));

    const totalAmount = rows.reduce((sum, row) => sum + row.inrAmount, 0);

    const constants = this.loadAppConstants();
    const ratesLastFetchedAt = constants?.CURRENCY_RATES_LAST_FETCHED_AT ?? null;

    return {
      month: selectedMonth,
      items: rows,
      totalAmount,
      totalCurrency: 'INR',
      ratesLastFetchedAt,
    };
  }

  async updateClient(tenantId: string, clientId: string, dto: UpdateClientDto) {
    const client = await this.requireClient(tenantId, clientId);
    const name = this.clean(dto.customerName);
    if (!name) {
      throw new BadRequestException('Customer name is required');
    }

    let primaryContactId = client.primaryContactId ?? null;
    const contactName = this.clean(dto.contactPerson);
    const contactEmail = this.clean(dto.email);
    const contactPhone = this.clean(dto.phone);

    if (contactName || contactEmail || contactPhone) {
      if (primaryContactId) {
        await this.repository.updateContact(primaryContactId, {
          firstName: contactName ? this.toFirstName(contactName) : undefined,
          lastName: contactName ? this.toLastName(contactName) : undefined,
          fullName: contactName ?? undefined,
          email: contactEmail,
          phone: contactPhone,
        });
      } else {
        const contact = await this.repository.createContact({
          tenant: { connect: { id: tenantId } },
          company: { connect: { id: clientId } },
          firstName: this.toFirstName(contactName || name),
          lastName: this.toLastName(contactName || name),
          fullName: contactName || name,
          email: contactEmail,
          phone: contactPhone,
        });
        primaryContactId = contact.id;
      }
    }

    const updated = await this.repository.updateClient(clientId, {
      name,
      normalizedName: this.normalizeName(name),
      phone: this.clean(dto.phone),
      taxId: this.clean(dto.gst),
      ...(primaryContactId ? { primaryContact: { connect: { id: primaryContactId } } } : {}),
    });

    return this.mapClient(updated);
  }

  async deleteClient(tenantId: string, clientId: string) {
    await this.requireClient(tenantId, clientId);
    await this.repository.deleteClientFinanceProjection(tenantId, clientId);
    return { success: true };
  }

  async createWorkOrder(tenantId: string, clientId: string, dto: CreateWorkOrderDto) {
    try {
      const client = await this.requireClient(tenantId, clientId);
      this.validateCreatePayload(dto);

      const deal = await this.repository.createDeal({
        tenant: { connect: { id: tenantId } },
        company: { connect: { id: client.id } },
        title: dto.projectName,
        description: this.clean(dto.scope),
        currency: this.clean(dto.currency) ?? client.currency ?? 'INR',
        value: new Prisma.Decimal(dto.woValue),
        stage: 'CLOSED_WON',
        ...(client.primaryContactId ? { primaryContact: { connect: { id: client.primaryContactId } } } : {}),
      });

      const workOrder = await this.repository.createWorkOrder({
        tenant: { connect: { id: tenantId } },
        deal: { connect: { id: deal.id } },
        actualValue: new Prisma.Decimal(dto.woValue),
        taxId: client.taxId ?? null,
        paymentTerms: this.clean(dto.paymentTerms) ?? client.paymentTerms ?? null,
        projectType: this.clean(dto.projectType),
        poNumber: dto.woNumber,
        poDate: new Date(dto.woDate),
        poEndDate: dto.poExpiry ? new Date(dto.poExpiry) : null,
        poDocumentUrl: this.clean(dto.poDocumentUrl),
        duration: this.buildDuration(dto.startDate, dto.endDate),
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        scopeOfWork: this.clean(dto.scope),
        items: {
          create: dto.items.map((item) => ({
            tenantId,
            itemDetails: item.itemDetails,
            itemType: item.itemType,
            itemAmount: new Prisma.Decimal(item.amount),
            billingFrequency: item.billingFrequency,
          })),
        },
      });

      for (const item of dto.items) {
        const cleanedItemType = this.clean(item.itemType);
        if (cleanedItemType) {
          await this.ensureTenantItemType(tenantId, cleanedItemType);
        }
      }

      const createdItems = await this.repository.listItemOptions(tenantId, workOrder.id);
      const itemByDetails = new Map(
        createdItems.map((item) => [item.itemDetails.trim().toLowerCase(), item]),
      );

      for (const schedule of dto.schedule) {
        const linkedItem = schedule.workOrderItemId
          ? createdItems.find((item) => item.id === schedule.workOrderItemId) ?? null
          : itemByDetails.get(schedule.itemDetails.trim().toLowerCase()) ?? null;

        await this.repository.createSchedule({
          tenant: { connect: { id: tenantId } },
          workOrder: { connect: { id: workOrder.id } },
          ...(linkedItem ? { workOrderItem: { connect: { id: linkedItem.id } } } : {}),
          itemDetails: linkedItem?.itemDetails ?? schedule.itemDetails,
          amount: new Prisma.Decimal(schedule.amount),
          scheduleDate: new Date(schedule.scheduleDate),
          installmentLabel: this.clean(schedule.installmentLabel),
        });
      }

      if (client.status !== 'Client') {
        await this.repository.updateClient(client.id, { status: 'Client' });
      }

      return {
        workOrder: this.mapWorkOrderDetail(workOrder),
      };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.createWorkOrder',
        error: err,
        context: { tenantId, clientId, dto },
      });
      throw err;
    }
  }

  async getWorkOrder(tenantId: string, workOrderId: string) {
    const workOrder = await this.requireWorkOrder(tenantId, workOrderId);
    return this.mapWorkOrderDetail(workOrder);
  }

  async getInvoiceOptions(tenantId: string) {
    const hsnSacCodes = await this.getHsnSacCodes(tenantId);
    const appConstants = this.loadAppConstants();
    const serviceCategoryHsnSacCodes =
      appConstants?.SERVICE_CATEGORIES_HSN_SAC_CODES ??
      appConstants?.SERVICE_CATEGORIES_ ??
      {};

    return {
      nextInvoiceNo: await this.getNextInvoiceNumber(tenantId),
      hsnSac: hsnSacCodes[0] || '998313',
      hsnSacCodes,
      serviceCategoryHsnSacCodes,
      taxRates: this.getInvoiceTaxRates(),
    };
  }

  async createHsnSacCode(tenantId: string, dto: CreateHsnSacCodeDto) {
    const code = this.clean(dto.code);
    if (!code) {
      throw new BadRequestException('HSN/SAC code is required');
    }

    const normalizedCode = this.normalizeHsnSacCode(code);
    const existing = await this.repository.findTenantHsnSacCodeByNormalizedCode(tenantId, normalizedCode);
    if (existing) {
      return { code: existing.code, codes: await this.getHsnSacCodes(tenantId) };
    }

    const created = await this.repository.createTenantHsnSacCode({
      tenant: { connect: { id: tenantId } },
      code,
      normalizedCode,
    });

    return { code: created.code, codes: await this.getHsnSacCodes(tenantId) };
  }

  async updateWorkOrder(tenantId: string, workOrderId: string, dto: UpdateWorkOrderDto) {
    try {
      const workOrder = await this.requireWorkOrder(tenantId, workOrderId);
      const updatedDeal = await this.repository.updateDeal(workOrder.dealId, {
        title: dto.projectName,
        description: this.clean(dto.scope),
        value: new Prisma.Decimal(dto.woValue),
      });

      const updatedWorkOrder = await this.repository.updateWorkOrder(workOrder.id, {
        actualValue: new Prisma.Decimal(dto.woValue),
        projectType: this.clean(dto.projectType),
        poNumber: dto.woNumber,
        poDate: new Date(dto.woDate),
        poEndDate: dto.poExpiry ? new Date(dto.poExpiry) : null,
        duration: this.buildDuration(dto.startDate, dto.endDate),
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        scopeOfWork: this.clean(dto.scope),
        poDocumentUrl: this.clean(dto.poDocumentUrl) ?? workOrder.poDocumentUrl,
      });

      return this.mapWorkOrderDetail({
        ...updatedWorkOrder,
        deal: updatedDeal,
      });
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.updateWorkOrder',
        error: err,
        context: { tenantId, workOrderId, dto },
      });
      throw err;
    }
  }

  async deleteWorkOrder(tenantId: string, workOrderId: string) {
    try {
      await this.requireWorkOrder(tenantId, workOrderId);
      await this.repository.deleteWorkOrder(workOrderId);
      return { success: true };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.deleteWorkOrder',
        error: err,
        context: { tenantId, workOrderId },
      });
      throw err;
    }
  }

  async listItems(tenantId: string, workOrderId: string, query: ListWorkOrderItemsQueryDto) {
    await this.requireWorkOrder(tenantId, workOrderId);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const search = this.clean(query.search);
    const where: Prisma.WorkOrderItemWhereInput = {
      tenantId,
      workOrderId,
      ...(search
        ? {
          OR: [
            { itemDetails: { contains: search, mode: 'insensitive' } },
            { itemType: { contains: search, mode: 'insensitive' } },
            { billingFrequency: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.repository.listItems({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.getSimpleOrderBy(query.sortBy, query.sortDirection),
      }),
      this.repository.countItems(where),
    ]);

    return {
      items: items.map((item) => this.mapItem(item)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async saveItem(tenantId: string, workOrderId: string, itemId: string | null, dto: SaveWorkOrderItemDto) {
    try {
      const workOrder = await this.requireWorkOrder(tenantId, workOrderId);
      const itemType = this.clean(dto.itemType);
      if (!itemType) {
        throw new BadRequestException('Item type is required');
      }

      const existingItems = await this.repository.listItemOptions(tenantId, workOrderId);
      const usedAmount = existingItems.reduce((sum, item) => {
        if (itemId && item.id === itemId) {
          return sum;
        }

        return sum + Number(item.itemAmount ?? 0);
      }, 0);
      const orderValue = Number(workOrder.actualValue ?? 0);
      const nextAmount = Number(dto.itemAmount ?? 0);
      const remainingAmount = orderValue - usedAmount;

      if (orderValue > 0 && nextAmount > remainingAmount) {
        throw new BadRequestException(
          `Item amount exceeds order value. Remaining value is ${remainingAmount.toFixed(2)}`,
        );
      }

      await this.ensureTenantItemType(tenantId, itemType);

      const data = {
        itemDetails: dto.itemDetails,
        itemType,
        itemAmount: new Prisma.Decimal(dto.itemAmount),
        billingFrequency: dto.billingFrequency,
      };

      const record = itemId
        ? await this.updateExistingItem(tenantId, workOrderId, itemId, data)
        : await this.repository.createItem({
          tenant: { connect: { id: tenantId } },
          workOrder: { connect: { id: workOrderId } },
          ...data,
        });

      return this.mapItem(record);
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.saveItem',
        error: err,
        context: { tenantId, workOrderId, itemId, dto },
      });
      throw err;
    }
  }

  private async ensureTenantItemType(tenantId: string, label: string) {
    const normalizedLabel = this.normalizeName(label);
    const existing = await this.repository.findTenantItemTypeByNormalizedLabel(tenantId, normalizedLabel);
    if (existing) {
      return existing;
    }

    return this.repository.createTenantItemType({
      tenant: { connect: { id: tenantId } },
      label,
      normalizedLabel,
    });
  }

  async deleteItem(tenantId: string, workOrderId: string, itemId: string) {
    try {
      await this.requireExistingItem(tenantId, workOrderId, itemId);
      await this.repository.deleteItem(itemId);
      return { success: true };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.deleteItem',
        error: err,
        context: { tenantId, workOrderId, itemId },
      });
      throw err;
    }
  }

  async listSchedules(tenantId: string, workOrderId: string, query: ListWorkOrderSchedulesQueryDto) {
    await this.requireWorkOrder(tenantId, workOrderId);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const search = this.clean(query.search);
    const where: Prisma.WorkOrderScheduleWhereInput = {
      tenantId,
      workOrderId,
      ...(search
        ? {
          OR: [
            { itemDetails: { contains: search, mode: 'insensitive' } },
            { installmentLabel: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.repository.listSchedules({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.getSimpleOrderBy(query.sortBy, query.sortDirection),
        include: {
          workOrderItem: true,
        },
      }),
      this.repository.countSchedules(where),
    ]);

    return {
      items: items.map((item) => this.mapSchedule(item)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async saveSchedule(tenantId: string, workOrderId: string, scheduleId: string | null, dto: SaveWorkOrderScheduleDto) {
    try {
      await this.requireWorkOrder(tenantId, workOrderId);
      const linkedItem = dto.workOrderItemId
        ? await this.requireExistingItem(tenantId, workOrderId, dto.workOrderItemId)
        : null;
      const data = {
        itemDetails: linkedItem?.itemDetails ?? dto.itemDetails,
        amount: new Prisma.Decimal(dto.amount),
        scheduleDate: new Date(dto.scheduleDate),
        installmentLabel: this.clean(dto.installmentLabel),
        ...(linkedItem
          ? { workOrderItem: { connect: { id: linkedItem.id } } }
          : { workOrderItem: { disconnect: true } }),
      };

      const record = scheduleId
        ? await this.updateExistingSchedule(tenantId, workOrderId, scheduleId, data)
        : await this.repository.createSchedule({
          tenant: { connect: { id: tenantId } },
          workOrder: { connect: { id: workOrderId } },
          ...data,
        });

      return this.mapSchedule(record);
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.saveSchedule',
        error: err,
        context: { tenantId, workOrderId, scheduleId, dto },
      });
      throw err;
    }
  }

  async getScheduleItemOptions(tenantId: string, workOrderId: string) {
    await this.requireWorkOrder(tenantId, workOrderId);
    const items = await this.repository.listItemOptions(tenantId, workOrderId);
    const seen = new Set();

    return items
      .filter((item) => {
        const key = item.itemDetails.trim().toLowerCase();
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      })
      .map((item) => ({
        id: item.id,
        itemDetails: item.itemDetails,
        itemType: item.itemType,
      }));
  }

  async autoGenerateSchedules(
    tenantId: string,
    workOrderId: string,
    dto: AutoGenerateWorkOrderSchedulesDto,
  ) {
    try {
      const workOrder = await this.requireWorkOrder(tenantId, workOrderId);
      const scheduleStartDate = workOrder.startDate ?? workOrder.poDate;
      const scheduleEndDate = workOrder.poEndDate ?? workOrder.endDate;

      if (!scheduleStartDate || !scheduleEndDate) {
        throw new BadRequestException('Work order start date and expiry/end date are required to auto-generate schedules');
      }

      const items = await this.repository.listItemsByIds(tenantId, workOrderId, dto.itemIds);
      if (!items.length) {
        throw new BadRequestException('At least one valid item is required to auto-generate schedules');
      }

      const generatedSchedules = items.flatMap((item) => {
        const scheduleDates = this.buildScheduleDates(
          new Date(scheduleStartDate),
          new Date(scheduleEndDate),
          item.billingFrequency,
        );

        if (!scheduleDates.length) {
          throw new BadRequestException(`Unable to generate schedules for item "${item.itemDetails}" with billing frequency "${item.billingFrequency}"`);
        }

        const installmentAmounts = this.splitAmountAcrossInstallments(Number(item.itemAmount ?? 0), scheduleDates.length);

        return scheduleDates.map((scheduleDate, index) => ({
          tenantId,
          workOrderId,
          workOrderItemId: item.id,
          itemDetails: item.itemDetails,
          amount: new Prisma.Decimal(installmentAmounts[index]),
          scheduleDate,
          installmentLabel:
            scheduleDates.length === 1
              ? 'Installment 1 of 1'
              : `Installment ${index + 1} of ${scheduleDates.length}`,
        }));
      });

      await this.repository.deleteSchedulesByItemIds(tenantId, workOrderId, items.map((item) => item.id));
      await this.repository.createManySchedules(generatedSchedules);

      const refreshedSchedules = await this.repository.listSchedules({
        where: {
          tenantId,
          workOrderId,
          workOrderItemId: { in: items.map((item) => item.id) },
        },
        orderBy: [{ scheduleDate: 'asc' }, { createdAt: 'asc' }],
        include: {
          workOrderItem: true,
        },
      });

      return refreshedSchedules.map((item) => this.mapSchedule(item));
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.autoGenerateSchedules',
        error: err,
        context: { tenantId, workOrderId, dto },
      });
      throw err;
    }
  }

  async deleteSchedule(tenantId: string, workOrderId: string, scheduleId: string) {
    try {
      await this.requireExistingSchedule(tenantId, workOrderId, scheduleId);
      await this.repository.deleteSchedule(scheduleId);
      return { success: true };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.deleteSchedule',
        error: err,
        context: { tenantId, workOrderId, scheduleId },
      });
      throw err;
    }
  }

  async listInvoices(tenantId: string, workOrderId: string, query: ListWorkOrderInvoicesQueryDto) {
    await this.requireWorkOrder(tenantId, workOrderId);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const search = this.clean(query.search);
    const where: Prisma.WorkOrderInvoiceWhereInput = {
      tenantId,
      workOrderId,
      ...(search
        ? {
          OR: [
            { itemDetails: { contains: search, mode: 'insensitive' } },
            { invoiceNo: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };

      const [items, total] = await Promise.all([
      this.repository.listInvoices({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.getSimpleOrderBy(query.sortBy, query.sortDirection),
        include: {
          receipt: true,
          invoiceItems: {
            include: {
              schedule: true,
            },
            orderBy: [{ createdAt: 'asc' }],
          },
        },
      }),
      this.repository.countInvoices(where),
    ]);

    return {
      items: items.map((item) => this.mapInvoice(item)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async listAllInvoices(tenantId: string, query: ListAllInvoicesQueryDto) {
    try {
      const page = Number(query.page || 1);
      const limit = Number(query.limit || 10);
      const search = this.clean(query.search);
      const status = query.status;
      const dateFrom = query.dateFrom ? new Date(query.dateFrom) : null;
      const dateTo = query.dateTo ? new Date(query.dateTo) : null;

      const cleanSearch = search?.replace(/,/g, '');
      const searchNumber = cleanSearch && !isNaN(Number(cleanSearch)) ? Number(cleanSearch) : null;

      const where: Prisma.WorkOrderInvoiceWhereInput = {
        tenantId,
        ...(search
          ? {
            OR: [
              { invoiceNo: { contains: search, mode: 'insensitive' } },
              { itemDetails: { contains: search, mode: 'insensitive' } },
              { workOrder: { deal: { company: { name: { contains: search, mode: 'insensitive' } } } } },
              { workOrder: { deal: { title: { contains: search, mode: 'insensitive' } } } },
              ...(searchNumber !== null
                ? [
                  { totalAmount: { equals: searchNumber } },
                  { amount: { equals: searchNumber } },
                  { tax: { equals: searchNumber } },
                ]
                : []),
            ],
          }
          : {}),
        ...(dateFrom || dateTo
          ? {
            invoiceDate: {
              ...(dateFrom ? { gte: dateFrom } : {}),
              ...(dateTo ? { lte: dateTo } : {}),
            },
          }
          : {}),
      };

      if (status === 'Paid' || status === 'Received') {
        where.receipt = { isNot: null };
      } else if (status === 'Partially Received') {
        where.receipt = {
          is: {
            amountReceived: { gt: 0 },
          }
        };
      } else if (status === 'Overdue') {
        where.receipt = { is: null };
        where.invoiceDate = {
          ...(where.invoiceDate as any || {}),
          lt: new Date(),
        };
      } else if (status === 'Pending') {
        where.receipt = { is: null };
        where.invoiceDate = {
          ...(where.invoiceDate as any || {}),
          gte: new Date(),
        };
      }

      const [items, total] = await Promise.all([
        this.repository.listInvoices({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: this.getSimpleOrderBy(query.sortBy, query.sortDirection),
          include: {
            receipt: true,
            workOrder: {
              include: {
                deal: {
                  include: {
                    company: true,
                  },
                },
              },
            },
          },
        }),
        this.repository.countInvoices(where),
      ]);

      return {
        items: items.map((item: any) => {
          const mapped = this.mapInvoice(item);
          return {
            ...mapped,
            project: item.workOrder?.deal?.title ?? '',
            client: item.workOrder?.deal?.company?.name ?? '',
            clientId: item.workOrder?.deal?.company?.id ?? '',
          };
        }),
        pagination: this.buildPagination(page, limit, total),
      };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.listAllInvoices',
        error: err,
        context: { tenantId, query },
      });
      throw err;
    }
  }

  async saveInvoice(
    tenantId: string,
    workOrderId: string,
    invoiceId: string | null,
    dto: SaveWorkOrderInvoiceDto,
    actor?: JwtUser,
  ) {
    try {
      const workOrder = await this.requireWorkOrder(tenantId, workOrderId);
      const invoiceNo = invoiceId
        ? this.normalizeInvoiceNumber(dto.invoiceNo)
        : this.normalizeInvoiceNumber(dto.invoiceNo) || await this.getNextInvoiceNumber(tenantId);
      this.validateInvoicePayload(dto);
      if (!invoiceNo) {
        throw new BadRequestException('Invoice number is required');
      }
      await this.ensureInvoiceNumberAvailable(tenantId, invoiceNo, invoiceId ?? undefined);
      const previousInvoice = invoiceId
        ? await this.requireExistingInvoice(tenantId, workOrderId, invoiceId)
        : null;

      const waiveOffAmount = dto.waiveOff ? Number(dto.waiveOffAmount) : 0;
      const totalAmount = dto.totalAmount ?? Math.max(0, dto.amount + dto.tax - waiveOffAmount);
      const workOrderCurrency = String(
        workOrder?.deal?.currency ?? workOrder?.deal?.company?.currency ?? 'INR',
      ).toUpperCase();
      const shouldForceRefreshRates = Boolean(dto.savedAndDownloaded);
      const conversionRate = await this.getInrConversionRate(workOrderCurrency, shouldForceRefreshRates);
      const inrTotalAmount = Number(totalAmount) * conversionRate;
      const data = {
        itemDetails: dto.itemDetails,
        invoiceNo,
        invoiceDate: new Date(dto.invoiceDate),
        amount: new Prisma.Decimal(dto.amount),
        tax: new Prisma.Decimal(dto.tax),
        totalAmount: new Prisma.Decimal(totalAmount),
        conversionRate: new Prisma.Decimal(conversionRate),
        inrTotalAmount: new Prisma.Decimal(inrTotalAmount),
        waiveOff: Boolean(dto.waiveOff),
        waiveOffAmount: new Prisma.Decimal(waiveOffAmount),
        waiveOffReason: dto.waiveOff ? this.clean(dto.waiveOffReason) : null,
        customerNotes: this.clean(dto.customerNotes) ?? null,
        termsAndConditions: this.clean(dto.termsAndConditions) ?? null,
        placeOfSupply: this.clean(dto.placeOfSupply) ?? null,
        taxType: this.clean(dto.taxType) ?? null,
        gstPercent: new Prisma.Decimal(dto.gstPercent ?? 0),
        igstAmount: new Prisma.Decimal(dto.igstAmount ?? 0),
        cgstAmount: new Prisma.Decimal(dto.cgstAmount ?? 0),
        sgstAmount: new Prisma.Decimal(dto.sgstAmount ?? 0),
        ...(invoiceId
          ? (dto.createdFromInvoiceBuilder !== undefined ? { createdFromInvoiceBuilder: Boolean(dto.createdFromInvoiceBuilder) } : {})
          : { createdFromInvoiceBuilder: Boolean(dto.createdFromInvoiceBuilder) }),
        ...(invoiceId
          ? (dto.savedAndDownloaded !== undefined ? { savedAndDownloaded: Boolean(dto.savedAndDownloaded) } : {})
          : { savedAndDownloaded: Boolean(dto.savedAndDownloaded) }),
      };

      const record = invoiceId
        ? await this.updateExistingInvoice(tenantId, workOrderId, invoiceId, data)
        : await this.repository.createInvoice({
          tenant: { connect: { id: tenantId } },
          workOrder: { connect: { id: workOrderId } },
          ...data,
        });

      await this.syncInvoiceItems(tenantId, workOrderId, record.id, dto.invoiceItems ?? []);

      if (record.receipt) {
        await this.repository.updateReceipt(record.receipt.id, {
          invoiceNo,
        });
      }

      const refreshed = await this.repository.findInvoiceById(tenantId, workOrderId, record.id);
      if (actor) {
        await this.logInvoiceAudit(tenantId, workOrderId, actor, previousInvoice, refreshed);
      }
      return this.mapInvoice(refreshed);
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.saveInvoice',
        error: err,
        context: { tenantId, workOrderId, invoiceId, dto, actorId: actor?.sub },
      });
      throw err;
    }
  }

  async deleteInvoice(tenantId: string, workOrderId: string, invoiceId: string) {
    try {
      const invoice = await this.requireExistingInvoice(tenantId, workOrderId, invoiceId);
      if (invoice.receipt) {
        await this.repository.deleteReceipt(invoice.receipt.id);
      }
      await this.repository.deleteInvoice(invoiceId);
      return { success: true };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.deleteInvoice',
        error: err,
        context: { tenantId, workOrderId, invoiceId },
      });
      throw err;
    }
  }



  private async getNextInvoiceNumber(tenantId: string) {
    const records = await this.repository.listTenantInvoiceNumbers(tenantId);
    const currentYearBase = new Date().getFullYear() * 1000;
    const maxNumber = records.reduce((max, record) => {
      const match = /^INV(\d+)$/i.exec(record.invoiceNo || '');
      if (!match) return max;
      return Math.max(max, Number(match[1]) || 0);
    }, currentYearBase);

    return `INV${maxNumber + 1}`;
  }

  async listAllReceipts(tenantId: string, query: ListAllReceiptsQueryDto) {
    try {
      const page = Number(query.page || 1);
      const limit = Number(query.limit || 10);
      const search = this.clean(query.search);

      const where: Prisma.WorkOrderReceiptWhereInput = {
        tenantId,
        ...(search
          ? {
              OR: [
                { invoiceNo: { contains: search, mode: 'insensitive' } },
                { details: { contains: search, mode: 'insensitive' } },
                {
                  workOrder: {
                    deal: {
                      title: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
                {
                  workOrder: {
                    deal: {
                      company: {
                        name: { contains: search, mode: 'insensitive' },
                      },
                    },
                  },
                },
              ],
            }
          : {}),
      };

      if (query.range && query.range !== 'all') {
        const periods = this.calculatePeriods(query.range, query.fromDate, query.toDate);
        where.receiptDate = { gte: periods.current.start, lte: periods.current.end };
      }

      const orderBy = this.getReceiptOrderBy(query.sortBy, query.sortDirection);

      const [items, total] = await Promise.all([
        this.repository.listAllReceipts({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy,
          include: {
            workOrder: {
              include: {
                deal: {
                  include: {
                    company: true,
                  },
                },
              },
            },
            invoice: true,
          },
        }),
        this.repository.countAllReceipts(where),
      ]);

      return {
        items: items.map((receipt) => this.mapReceiptDetail(receipt)),
        pagination: this.buildPagination(page, limit, total),
      };
    } catch (error) {
      await notifyProductionError({
        functionName: 'FinanceOpsService.listAllReceipts',
        error,
        context: { tenantId, query },
      });
      throw error;
    }
  }

  async listReceipts(tenantId: string, workOrderId: string, query: ListWorkOrderReceiptsQueryDto) {
    await this.requireWorkOrder(tenantId, workOrderId);
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);
    const search = this.clean(query.search);
    const where: Prisma.WorkOrderReceiptWhereInput = {
      tenantId,
      workOrderId,
      ...(search
        ? {
          OR: [
            { invoiceNo: { contains: search, mode: 'insensitive' } },
            { paymentMode: { contains: search, mode: 'insensitive' } },
            { details: { contains: search, mode: 'insensitive' } },
          ],
        }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.repository.listReceipts({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.getSimpleOrderBy(query.sortBy, query.sortDirection),
        include: { invoice: true },
      }),
      this.repository.countReceipts(where),
    ]);

    return {
      items: items.map((item) => this.mapReceipt(item)),
      pagination: this.buildPagination(page, limit, total),
    };
  }

  async saveReceipt(tenantId: string, workOrderId: string, receiptId: string | null, dto: SaveWorkOrderReceiptDto) {
    try {
      await this.requireWorkOrder(tenantId, workOrderId);
      this.validateReceiptPayload(dto);

      let linkedInvoice = null;
      if (dto.invoiceId) {
        linkedInvoice = await this.requireExistingInvoice(tenantId, workOrderId, dto.invoiceId);
      }

      const payload = {
        invoiceNo: linkedInvoice?.invoiceNo ?? dto.invoiceNo,
        receiptDate: new Date(dto.receiptDate),
        amountReceived: new Prisma.Decimal(dto.amountReceived),
        tds: new Prisma.Decimal(dto.tds ?? 0),
        chargesAndLevies: new Prisma.Decimal(dto.chargesAndLevies ?? 0),
        withholding: new Prisma.Decimal(dto.withholding ?? 0),
        paymentMode: dto.paymentMode,
        details: this.clean(dto.details),
      };

      const record = receiptId
        ? await this.updateExistingReceipt(tenantId, workOrderId, receiptId, {
          ...payload,
          ...(linkedInvoice ? { invoice: { connect: { id: linkedInvoice.id } } } : {}),
        })
        : await this.repository.createReceipt({
          tenant: { connect: { id: tenantId } },
          workOrder: { connect: { id: workOrderId } },
          ...(linkedInvoice ? { invoice: { connect: { id: linkedInvoice.id } } } : {}),
          ...payload,
        });

      return this.mapReceipt(record);
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.saveReceipt',
        error: err,
        context: { tenantId, workOrderId, receiptId, dto },
      });
      throw err;
    }
  }

  async deleteReceipt(tenantId: string, workOrderId: string, receiptId: string) {
    try {
      await this.requireExistingReceipt(tenantId, workOrderId, receiptId);
      await this.repository.deleteReceipt(receiptId);
      return { success: true };
    } catch (err) {
      notifyProductionError({
        functionName: 'FinanceOpsService.deleteReceipt',
        error: err,
        context: { tenantId, workOrderId, receiptId },
      });
      throw err;
    }
  }

  private async ensureInvoiceNumberAvailable(tenantId: string, invoiceNo: string, excludeId?: string) {
    const existing = await this.repository.findInvoiceByNumber(tenantId, invoiceNo, excludeId);
    if (existing) {
      throw new BadRequestException('Invoice number already exists');
    }
  }

  private normalizeInvoiceNumber(invoiceNo?: string) {
    const cleaned = (this.clean(invoiceNo) ?? '').toUpperCase();
    if (!cleaned) {
      return cleaned;
    }
    return cleaned.startsWith('INV') ? cleaned : `INV${cleaned}`;
  }

  private async getHsnSacCodes(tenantId: string) {
    const merged = new Map<string, string>();

    for (const code of this.getDefaultHsnSacCodes()) {
      const normalized = this.normalizeHsnSacCode(code);
      if (normalized) {
        merged.set(normalized, code);
      }
    }

    const tenantCodes = await this.repository.listTenantHsnSacCodes(tenantId);
    for (const item of tenantCodes) {
      merged.set(item.normalizedCode, item.code);
    }

    return Array.from(merged.values());
  }

  private getDefaultHsnSacCodes() {
    const configured = appConstants.INVOICE_HSN_SAC_CODES ?? ['998313'];
    const codes = Array.isArray(configured) ? configured : String(configured).split(',');
    return codes
      .map((code) => this.clean(String(code)))
      .filter((code): code is string => Boolean(code));
  }

  private normalizeHsnSacCode(code: string) {
    return (this.clean(code) ?? '').replace(/\s+/g, '').toUpperCase();
  }

  private getInvoiceTaxRates() {
    const configured = Array.isArray(appConstants.INVOICE_TAX_RATES)
      ? appConstants.INVOICE_TAX_RATES
      : [];

    return configured
      .map((item: any) => {
        if (typeof item === 'number' || typeof item === 'string') {
          const percent = Number(item);
          if (!Number.isFinite(percent)) return null;
          return {
            label: `IGST ${percent}%`,
            type: 'IGST',
            percent,
          };
        }

        const percent = Number(item?.percent);
        if (!Number.isFinite(percent)) return null;
        return {
          label: this.clean(item?.label) ?? `${this.clean(item?.type) || 'IGST'} ${percent}%`,
          type: this.clean(item?.type) ?? 'IGST',
          percent,
        };
      })
      .filter(Boolean);
  }

  private async requireClient(tenantId: string, clientId: string) {
    const client = await this.repository.findClientById(tenantId, clientId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  private async requireWorkOrder(tenantId: string, workOrderId: string) {
    const workOrder = await this.repository.findWorkOrderById(tenantId, workOrderId);
    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    return workOrder;
  }

  private async requireExistingItem(tenantId: string, workOrderId: string, itemId: string) {
    const item = await this.repository.findItemById(tenantId, workOrderId, itemId);
    if (!item) {
      throw new NotFoundException('Item not found');
    }
    return item;
  }

  private async requireExistingSchedule(tenantId: string, workOrderId: string, scheduleId: string) {
    const schedule = await this.repository.findScheduleById(tenantId, workOrderId, scheduleId);
    if (!schedule) {
      throw new NotFoundException('Schedule record not found');
    }
    return schedule;
  }

  async getInvoice(tenantId: string, id: string) {
    const invoice = await this.prisma.workOrderInvoice.findFirst({
      where: { tenantId, id },
      include: {
        receipt: true,
        invoiceItems: {
          include: {
            schedule: true,
          },
          orderBy: [{ createdAt: 'asc' }],
        },
        workOrder: {
          include: {
            deal: {
              include: {
                company: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.mapInvoice(invoice);
  }

  private async requireExistingInvoice(tenantId: string, workOrderId: string, invoiceId: string) {
    const invoice = await this.repository.findInvoiceById(tenantId, workOrderId, invoiceId);
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  private async requireExistingReceipt(tenantId: string, workOrderId: string, receiptId: string) {
    const receipt = await this.repository.findReceiptById(tenantId, workOrderId, receiptId);
    if (!receipt) {
      throw new NotFoundException('Receipt not found');
    }
    return receipt;
  }

  private async updateExistingItem(
    tenantId: string,
    workOrderId: string,
    itemId: string,
    data: Prisma.WorkOrderItemUpdateInput,
  ) {
    await this.requireExistingItem(tenantId, workOrderId, itemId);
    return this.repository.updateItem(itemId, data);
  }

  private async updateExistingSchedule(
    tenantId: string,
    workOrderId: string,
    scheduleId: string,
    data: Prisma.WorkOrderScheduleUpdateInput,
  ) {
    await this.requireExistingSchedule(tenantId, workOrderId, scheduleId);
    return this.repository.updateSchedule(scheduleId, data);
  }

  private async updateExistingInvoice(
    tenantId: string,
    workOrderId: string,
    invoiceId: string,
    data: Prisma.WorkOrderInvoiceUpdateInput,
  ) {
    await this.requireExistingInvoice(tenantId, workOrderId, invoiceId);
    return this.repository.updateInvoice(invoiceId, data);
  }

  private async updateExistingReceipt(
    tenantId: string,
    workOrderId: string,
    receiptId: string,
    data: Prisma.WorkOrderReceiptUpdateInput,
  ) {
    await this.requireExistingReceipt(tenantId, workOrderId, receiptId);
    return this.repository.updateReceipt(receiptId, data);
  }

  private validateCreatePayload(dto: CreateWorkOrderDto) {
    if (!dto.items?.length) {
      throw new BadRequestException('At least one item is required');
    }

    if (!dto.schedule?.length) {
      throw new BadRequestException('At least one schedule entry is required');
    }
  }

  private validateInvoicePayload(dto: SaveWorkOrderInvoiceDto) {
    if (dto.amount === null || dto.amount === undefined || Number.isNaN(Number(dto.amount))) {
      throw new BadRequestException('Amount is required');
    }

    if (dto.tax === null || dto.tax === undefined || Number.isNaN(Number(dto.tax))) {
      throw new BadRequestException('Tax is required');
    }

    if (dto.waiveOff) {
      if (
        dto.waiveOffAmount === null ||
        dto.waiveOffAmount === undefined ||
        Number.isNaN(Number(dto.waiveOffAmount))
      ) {
        throw new BadRequestException('Waive off amount is required when waive off is enabled');
      }
    }
  }

  private validateReceiptPayload(dto: SaveWorkOrderReceiptDto) {
    if (!this.clean(dto.invoiceNo)) {
      throw new BadRequestException('Invoice number is required');
    }

    if (!dto.receiptDate) {
      throw new BadRequestException('Receipt date is required');
    }

    if (
      dto.amountReceived === null ||
      dto.amountReceived === undefined ||
      Number.isNaN(Number(dto.amountReceived))
    ) {
      throw new BadRequestException('Amount is required');
    }

    if (!this.clean(dto.paymentMode)) {
      throw new BadRequestException('Payment mode is required');
    }
  }

  private getClientOrderBy(sortBy?: string, sortDirection: 'asc' | 'desc' = 'asc') {
    switch (sortBy) {
      case 'customerName':
        return { name: sortDirection } satisfies Prisma.CompanyOrderByWithRelationInput;
      case 'phone':
        return { phone: sortDirection } satisfies Prisma.CompanyOrderByWithRelationInput;
      case 'gst':
        return { taxId: sortDirection } satisfies Prisma.CompanyOrderByWithRelationInput;
      case 'contactPerson':
      case 'email':
        return { primaryContact: { fullName: sortDirection } } satisfies Prisma.CompanyOrderByWithRelationInput;
      default:
        return { name: 'asc' } satisfies Prisma.CompanyOrderByWithRelationInput;
    }
  }

  private getWorkOrderOrderBy(sortBy?: string, sortDirection: 'asc' | 'desc' = 'asc') {
    switch (sortBy) {
      case 'project':
        return { title: sortDirection } satisfies Prisma.DealOrderByWithRelationInput;
      case 'woNumber':
        return { workOrder: { poNumber: sortDirection } } satisfies Prisma.DealOrderByWithRelationInput;
      case 'woValue':
        return { workOrder: { actualValue: sortDirection } } satisfies Prisma.DealOrderByWithRelationInput;
      case 'woDate':
        return { workOrder: { poDate: sortDirection } } satisfies Prisma.DealOrderByWithRelationInput;
      case 'woPeriod':
        return { workOrder: { duration: sortDirection } } satisfies Prisma.DealOrderByWithRelationInput;
      default:
        return { updatedAt: 'desc' } satisfies Prisma.DealOrderByWithRelationInput;
    }
  }

  private getWorkOrderOrderByForWorkOrderTable(sortBy?: string, sortDirection: 'asc' | 'desc' = 'asc') {
    switch (sortBy) {
      case 'project':
        return { deal: { title: sortDirection } } satisfies Prisma.WorkOrderOrderByWithRelationInput;
      case 'woNumber':
        return { poNumber: sortDirection } satisfies Prisma.WorkOrderOrderByWithRelationInput;
      case 'woValue':
        return { actualValue: sortDirection } satisfies Prisma.WorkOrderOrderByWithRelationInput;
      case 'woDate':
        return { poDate: sortDirection } satisfies Prisma.WorkOrderOrderByWithRelationInput;
      case 'woPeriod':
        return { duration: sortDirection } satisfies Prisma.WorkOrderOrderByWithRelationInput;
      default:
        return { updatedAt: 'desc' } satisfies Prisma.WorkOrderOrderByWithRelationInput;
    }
  }

  private getSimpleOrderBy(sortBy?: string, sortDirection: 'asc' | 'desc' = 'asc') {
    if (!sortBy) {
      return { updatedAt: 'desc' as const };
    }

    return { [sortBy]: sortDirection } as Record<string, 'asc' | 'desc'>;
  }

  private buildPagination(page: number, limit: number, total: number) {
    return {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  private mapClient(client: any) {
    return {
      id: client.id,
      customerName: client.name,
      contactPerson:
        client.primaryContact?.fullName ??
        client.contacts?.[0]?.fullName ??
        '',
      phone: client.primaryContact?.phone ?? client.phone ?? '',
      email: client.primaryContact?.email ?? '',
      gst: client.taxId ?? '',
      status: client.status,
      currency: client.currency ?? 'INR',
      paymentTerms: client.paymentTerms ?? '',
      workOrderCount:
        client.deals?.filter((deal: any) => deal.workOrder).length ?? undefined,
    };
  }

  private mapWorkOrderSummary(workOrder: any, deal: any) {
    return {
      id: workOrder.id,
      project: deal.title,
      woNumber: workOrder.poNumber ?? '',
      woValue: Number(workOrder.actualValue ?? 0),
      currency: deal.currency ?? deal.company?.currency ?? 'INR',
      woDate: this.toDateInput(workOrder.poDate),
      woPeriod: workOrder.duration || this.buildDurationFromDates(workOrder.startDate, workOrder.endDate),
      startDate: this.toDateInput(workOrder.startDate),
      endDate: this.toDateInput(workOrder.endDate),
      poExpiry: this.toDateInput(workOrder.poEndDate),
      projectType: workOrder.projectType ?? '',
      workScope: workOrder.scopeOfWork ?? deal.description ?? '',
      poDocumentUrl: workOrder.poDocumentUrl ?? '',
    };
  }

  private mapWorkOrderDetail(workOrder: any) {
    return {
      id: workOrder.id,
      clientId: workOrder.deal?.company?.id ?? '',
      customerName: workOrder.deal?.company?.name ?? '',
      project: workOrder.deal?.title ?? '',
      woNumber: workOrder.poNumber ?? '',
      woValue: Number(workOrder.actualValue ?? 0),
      woDate: this.toDateInput(workOrder.poDate),
      woPeriod: workOrder.duration || this.buildDurationFromDates(workOrder.startDate, workOrder.endDate),
      startDate: this.toDateInput(workOrder.startDate),
      endDate: this.toDateInput(workOrder.endDate),
      poExpiry: this.toDateInput(workOrder.poEndDate),
      projectType: workOrder.projectType ?? '',
      workScope: workOrder.scopeOfWork ?? workOrder.deal?.description ?? '',
      status: 'Active',
      paymentTerms: workOrder.paymentTerms ?? workOrder.deal?.company?.paymentTerms ?? '',
      currency: workOrder.deal?.currency ?? workOrder.deal?.company?.currency ?? 'INR',
      poDocumentUrl: workOrder.poDocumentUrl ?? '',
      client: {
        name: workOrder.deal.company.name,
        taxId: workOrder.deal.company.taxId ?? '',
        placeOfSupply: workOrder.deal.company.placeOfSupply ?? '',
        billingStreet: workOrder.deal.company.billingStreet ?? '',
        billingCity: workOrder.deal.company.billingCity ?? '',
        billingState: workOrder.deal.company.billingState ?? '',
        billingCountry: workOrder.deal.company.billingCountry ?? '',
        billingZip: workOrder.deal.company.billingZip ?? '',
      },
    };
  }

  private mapItem(item: any) {
    return {
      id: item.id,
      itemDetails: item.itemDetails,
      itemType: item.itemType,
      itemAmount: Number(item.itemAmount ?? 0),
      billingFrequency: item.billingFrequency,
    };
  }

  private mapSchedule(item: any) {
    return {
      id: item.id,
      workOrderItemId: item.workOrderItemId ?? item.workOrderItem?.id ?? null,
      itemDetails: item.itemDetails,
      amount: Number(item.amount ?? 0),
      scheduleDate: this.toDateInput(item.scheduleDate),
      installmentLabel: item.installmentLabel ?? '',
    };
  }

  private mapInvoice(item: any) {
    const received = Number(item.receipt?.amountReceived ?? 0);
    const total = Number(item.totalAmount ?? 0);
    let status = 'Pending';

    if (!item.receipt) {
      status = 'Pending';
    } else if (received >= total) {
      status = 'Received';
    } else if (received > 0) {
      status = 'Partially Received';
    }

    return {
      id: item.id,
      workOrderId: item.workOrderId,
      invoiceId: item.id,
      itemDetails: item.itemDetails,
      invoiceNo: item.invoiceNo,
      invoiceDate: this.toDateInput(item.invoiceDate),
      amount: Number(item.amount ?? 0),
      tax: Number(item.tax ?? 0),
      totalAmount: Number(item.totalAmount ?? 0),
      conversionRate: item.conversionRate === null || item.conversionRate === undefined
        ? null
        : Number(item.conversionRate),
      inrTotalAmount: item.inrTotalAmount === null || item.inrTotalAmount === undefined
        ? null
        : Number(item.inrTotalAmount),
      waiveOff: Boolean(item.waiveOff),
      waiveOffAmount: Number(item.waiveOffAmount ?? 0),
      waiveOffReason: item.waiveOffReason ?? '',
      customerNotes: item.customerNotes ?? '',
      termsAndConditions: item.termsAndConditions ?? '',
      placeOfSupply: item.placeOfSupply ?? '',
      taxType: item.taxType ?? '',
      gstPercent: Number(item.gstPercent ?? 0),
      igstAmount: Number(item.igstAmount ?? 0),
      cgstAmount: Number(item.cgstAmount ?? 0),
      sgstAmount: Number(item.sgstAmount ?? 0),
      createdFromInvoiceBuilder: Boolean(item.createdFromInvoiceBuilder),
      savedAndDownloaded: Boolean(item.savedAndDownloaded),
      currency: item.workOrder?.deal?.currency ?? item.workOrder?.deal?.company?.currency ?? 'INR',
      workOrder: item.workOrder,
      invoiceItems: Array.isArray(item.invoiceItems)
        ? item.invoiceItems.map((invoiceItem: any) => ({
          id: invoiceItem.id,
          workOrderScheduleId: invoiceItem.workOrderScheduleId ?? null,
          itemLabel: invoiceItem.itemLabel,
          hsnSac: invoiceItem.hsnSac ?? null,
          qty: Number(invoiceItem.qty ?? 0),
          rate: Number(invoiceItem.rate ?? 0),
          taxLabel: invoiceItem.taxLabel ?? null,
          taxPercent: Number(invoiceItem.taxPercent ?? 0),
          amount: Number(invoiceItem.amount ?? 0),
          tax: Number(invoiceItem.tax ?? 0),
          schedule: invoiceItem.schedule ? this.mapSchedule(invoiceItem.schedule) : null,
        }))
        : [],
      status,
      receiptId: item.receipt?.id ?? null,
      receipt: item.receipt ? this.mapReceipt(item.receipt) : null,
    };
  }

  private async logInvoiceAudit(
    tenantId: string,
    workOrderId: string,
    actor: JwtUser,
    previousInvoice: any | null,
    currentInvoice: any,
  ) {
    const previousSnapshot = previousInvoice ? this.buildInvoiceAuditSnapshot(previousInvoice) : null;
    const currentSnapshot = this.buildInvoiceAuditSnapshot(currentInvoice);

    await this.prisma.accessAuditLog.create({
      data: {
        tenantId,
        actorUserId: actor.sub,
        entityType: 'work-order-invoice',
        entityId: currentInvoice.id,
        eventType: previousInvoice ? 'finance-ops.invoice.updated' : 'finance-ops.invoice.created',
        summary: previousInvoice
          ? `Updated invoice ${currentInvoice.invoiceNo} for work order ${workOrderId}`
          : `Created invoice ${currentInvoice.invoiceNo} for work order ${workOrderId}`,
        metadata: previousInvoice
          ? {
            workOrderId,
            previous: previousSnapshot,
            next: currentSnapshot,
            changes: this.buildFieldChanges(previousSnapshot!, currentSnapshot),
          }
          : {
            workOrderId,
            created: currentSnapshot,
          },
      },
    });
  }

  private buildInvoiceAuditSnapshot(invoice: any) {
    return {
      id: invoice.id,
      workOrderId: invoice.workOrderId,
      itemDetails: invoice.itemDetails,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: this.toDateInput(invoice.invoiceDate),
      amount: Number(invoice.amount ?? 0),
      tax: Number(invoice.tax ?? 0),
      totalAmount: Number(invoice.totalAmount ?? 0),
      conversionRate: invoice.conversionRate === null || invoice.conversionRate === undefined
        ? null
        : Number(invoice.conversionRate),
      inrTotalAmount: invoice.inrTotalAmount === null || invoice.inrTotalAmount === undefined
        ? null
        : Number(invoice.inrTotalAmount),
      waiveOff: Boolean(invoice.waiveOff),
      waiveOffAmount: Number(invoice.waiveOffAmount ?? 0),
      waiveOffReason: invoice.waiveOffReason ?? '',
      customerNotes: invoice.customerNotes ?? '',
      termsAndConditions: invoice.termsAndConditions ?? '',
      placeOfSupply: invoice.placeOfSupply ?? '',
      taxType: invoice.taxType ?? '',
      gstPercent: Number(invoice.gstPercent ?? 0),
      igstAmount: Number(invoice.igstAmount ?? 0),
      cgstAmount: Number(invoice.cgstAmount ?? 0),
      sgstAmount: Number(invoice.sgstAmount ?? 0),
      createdFromInvoiceBuilder: Boolean(invoice.createdFromInvoiceBuilder),
      savedAndDownloaded: Boolean(invoice.savedAndDownloaded),
      invoiceItemScheduleIds: Array.isArray(invoice.invoiceItems)
        ? invoice.invoiceItems.map((entry: any) => entry.workOrderScheduleId).filter(Boolean)
        : [],
      receiptId: invoice.receipt?.id ?? null,
    };
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
    fs.writeFileSync(this.constantsPath, `module.exports = ${serialized};\n`, 'utf8');
  }

  private async refreshExchangeRatesIfNeeded(forceRefresh = false) {
    const constants = this.loadAppConstants();
    const lastFetchedAtRaw = constants.CURRENCY_RATES_LAST_FETCHED_AT;
    const lastFetchedAtMs = lastFetchedAtRaw ? new Date(lastFetchedAtRaw).getTime() : 0;
    const nowMs = Date.now();

    if (!forceRefresh && lastFetchedAtMs && nowMs - lastFetchedAtMs < this.ratesRefreshIntervalMs) {
      return constants;
    }

    const apiKey = process.env.EXCHANGE_RATE_API_KEY;
    if (!apiKey) {
      return constants;
    }

    try {
      const response = await fetch(`https://v6.exchangerate-api.com/v6/${apiKey}/latest/USD`);
      if (!response.ok) {
        return constants;
      }
      const payload = await response.json();
      const conversionRates = payload?.conversion_rates;
      if (!conversionRates || typeof conversionRates !== 'object') {
        return constants;
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
      return constants;
    } catch {
      return constants;
    }
  }

  private async getInrConversionRate(currency: string, forceRefresh = false): Promise<number> {
    const fromCurrency = (currency || 'INR').toUpperCase();
    if (fromCurrency === 'INR') {
      return 1;
    }

    const constants = await this.refreshExchangeRatesIfNeeded(forceRefresh);
    const rates = constants?.CURRENCY_RATES || {};
    const usdToInr = Number(rates.INR);

    if (!usdToInr || Number.isNaN(usdToInr)) {
      return 1;
    }
    if (fromCurrency === 'USD') {
      return usdToInr;
    }

    const usdToFrom = Number(rates[fromCurrency]);
    if (!usdToFrom || Number.isNaN(usdToFrom)) {
      return 1;
    }

    return usdToInr / usdToFrom;
  }

  private async syncInvoiceItems(
    tenantId: string,
    workOrderId: string,
    invoiceId: string,
    items: Array<{
      workOrderScheduleId?: string;
      itemLabel: string;
      hsnSac?: string;
      qty?: number;
      rate?: number;
      taxLabel?: string;
      taxPercent?: number;
      amount?: number;
      tax?: number;
    }>,
  ) {
    await this.prisma.workOrderInvoiceItem.deleteMany({
      where: {
        tenantId,
        workOrderId,
        invoiceId,
      },
    });

    if (!items.length) {
      return;
    }

    const scheduleIds = items.map((item) => item.workOrderScheduleId).filter(Boolean) as string[];
    if (scheduleIds.length) {
      const count = await this.prisma.workOrderSchedule.count({
        where: {
          tenantId,
          workOrderId,
          id: { in: scheduleIds },
        },
      });

      if (count !== new Set(scheduleIds).size) {
        throw new BadRequestException('Invalid schedule item mapping in invoice rows');
      }
    }

    await this.prisma.workOrderInvoiceItem.createMany({
      data: items.map((entry) => ({
        tenantId,
        workOrderId,
        invoiceId,
        workOrderScheduleId: entry.workOrderScheduleId ?? null,
        itemLabel: this.clean(entry.itemLabel) ?? '',
        hsnSac: this.clean(entry.hsnSac),
        qty: new Prisma.Decimal(entry.qty ?? 1),
        rate: new Prisma.Decimal(entry.rate ?? 0),
        taxLabel: this.clean(entry.taxLabel),
        taxPercent: new Prisma.Decimal(entry.taxPercent ?? 0),
        amount: new Prisma.Decimal(entry.amount ?? 0),
        tax: new Prisma.Decimal(entry.tax ?? 0),
      })),
    });
  }

  private buildFieldChanges(previous: Record<string, any>, next: Record<string, any>) {
    return Object.keys(next).flatMap((field) => {
      const previousValue = previous[field];
      const nextValue = next[field];
      if (previousValue === nextValue) {
        return [];
      }

      return [{
        field,
        previous: previousValue,
        next: nextValue,
      }];
    });
  }

  private mapReceiptDetail(item: any) {
    return {
      id: item.id,
      invoiceId: item.invoiceId,
      invoiceNo: item.invoiceNo,
      receiptDate: this.toDateInput(item.receiptDate),
      amountReceived: Number(item.amountReceived),
      tds: Number(item.tds ?? 0),
      chargesAndLevies: Number(item.chargesAndLevies ?? 0),
      withholding: Number(item.withholding ?? 0),
      paymentMode: item.paymentMode,
      details: item.details ?? '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      workOrderId: item.workOrderId,
      project: item.workOrder?.deal?.title ?? '',
      client: item.workOrder?.deal?.company?.name ?? '',
      clientId: item.workOrder?.deal?.companyId ?? '',
      currency: item.workOrder?.deal?.currency ?? item.workOrder?.deal?.company?.currency ?? 'INR',
    };
  }

  private mapReceipt(item: any) {
    return {
      id: item.id,
      invoiceId: item.invoiceId ?? null,
      invoiceNo: item.invoice?.invoiceNo ?? item.invoiceNo,
      receiptDate: this.toDateInput(item.receiptDate),
      amountReceived: Number(item.amountReceived ?? 0),
      tds: Number(item.tds ?? 0),
      chargesAndLevies: Number(item.chargesAndLevies ?? 0),
      withholding: Number(item.withholding ?? 0),
      paymentMode: item.paymentMode,
      details: item.details ?? '',
    };
  }

  private buildDuration(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) {
      return null;
    }

    return this.buildDurationFromDates(new Date(startDate), new Date(endDate));
  }

  private buildDurationFromDates(startDate?: Date | string | null, endDate?: Date | string | null) {
    if (!startDate || !endDate) {
      return '';
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const months = Math.max(
      1,
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + 1,
    );

    return `${months} Month${months > 1 ? 's' : ''}`;
  }

  private buildScheduleDates(startDate: Date, endDate: Date, billingFrequency: string) {
    const normalizedFrequency = this.clean(billingFrequency)?.toLowerCase();
    if (!normalizedFrequency) {
      return [];
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [];
    }

    if (normalizedFrequency === 'one-time') {
      return [start];
    }

    const stepMonths =
      normalizedFrequency === 'monthly'
        ? 1
        : normalizedFrequency === 'quarterly'
          ? 3
          : normalizedFrequency === 'annually'
            ? 12
            : null;

    if (!stepMonths) {
      return [];
    }

    const dates: Date[] = [];
    let cursor = new Date(start);

    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor = this.addMonths(cursor, stepMonths);
    }

    return dates;
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    const day = next.getDate();
    next.setMonth(next.getMonth() + months);
    if (next.getDate() < day) {
      next.setDate(0);
    }
    return next;
  }

  private splitAmountAcrossInstallments(totalAmount: number, installments: number) {
    if (installments <= 1) {
      return [Number(totalAmount.toFixed(2))];
    }

    const totalInCents = Math.round(totalAmount * 100);
    const baseAmountInCents = Math.floor(totalInCents / installments);
    const amounts = Array.from({ length: installments }, () => baseAmountInCents);
    amounts[installments - 1] += totalInCents - baseAmountInCents * installments;

    return amounts.map((amount) => amount / 100);
  }

  private clean(value?: string | null) {
    const next = value?.trim();
    return next ? next : null;
  }

  private normalizeName(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
  }

  private toFirstName(fullName: string) {
    const [first = ''] = fullName.trim().split(/\s+/);
    return first || fullName;
  }

  private toLastName(fullName: string) {
    const [, ...rest] = fullName.trim().split(/\s+/);
    return rest.join(' ') || null;
  }

  private toDateInput(value?: Date | string | null) {
    if (!value) {
      return '';
    }

    return new Date(value).toISOString().split('T')[0];
  }

  private toMonthInput(value?: Date | string | null) {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private parseSearchToDateRange(search: string) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');

    // 1. YYYY (e.g. "2026")
    const yearMatch = /^(\d{4})$/.exec(search);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      return {
        gte: new Date(`${year}-01-01T00:00:00.000Z`),
        lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
      };
    }

    // 2. YYYY-MM (e.g. "2026-04")
    const monthMatch = /^(\d{4})-(\d{1,2})$/.exec(search);
    if (monthMatch) {
      const year = parseInt(monthMatch[1], 10);
      const month = parseInt(monthMatch[2], 10);
      if (month >= 1 && month <= 12) {
        const nextMonthYear = month === 12 ? year + 1 : year;
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextMonthString = nextMonth.toString().padStart(2, '0');
        const currentMonthString = month.toString().padStart(2, '0');
        return {
          gte: new Date(`${year}-${currentMonthString}-01T00:00:00.000Z`),
          lt: new Date(`${nextMonthYear}-${nextMonthString}-01T00:00:00.000Z`),
        };
      }
    }

    // 3. YYYY-MM-DD (e.g. "2026-04-28")
    const dayMatch = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(search);
    if (dayMatch) {
      const m = dayMatch[2].padStart(2, '0');
      const d = dayMatch[3].padStart(2, '0');
      const parsedDate = new Date(`${dayMatch[1]}-${m}-${d}T00:00:00.000Z`);
      if (!Number.isNaN(parsedDate.getTime())) {
        const nextDay = new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000);
        return { gte: parsedDate, lt: nextDay };
      }
    }

    // 4. MM-DD (e.g. "04-28") -> Assumes Current Year
    const monthDayMatch = /^(\d{1,2})-(\d{1,2})$/.exec(search);
    if (monthDayMatch) {
      const m = monthDayMatch[1].padStart(2, '0');
      const d = monthDayMatch[2].padStart(2, '0');
      const parsedDate = new Date(`${currentYear}-${m}-${d}T00:00:00.000Z`);
      if (!Number.isNaN(parsedDate.getTime())) {
        const nextDay = new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000);
        return { gte: parsedDate, lt: nextDay };
      }
    }

    // 5. DD (e.g. "28") -> Assumes Current Year & Current Month
    // Only trigger if it's a valid day of the month (01-31)
    const exactDayMatch = /^(\d{1,2})$/.exec(search);
    if (exactDayMatch) {
      const day = parseInt(exactDayMatch[1], 10);
      if (day >= 1 && day <= 31) {
        const d = day.toString().padStart(2, '0');
        const parsedDate = new Date(`${currentYear}-${currentMonth}-${d}T00:00:00.000Z`);
        if (!Number.isNaN(parsedDate.getTime())) {
          const nextDay = new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000);
          return { gte: parsedDate, lt: nextDay };
        }
      }
    }

    return null;
  }
  private getReceiptOrderBy(sortBy?: string, sortDirection?: string): Prisma.WorkOrderReceiptOrderByWithRelationInput {
    const direction = sortDirection?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    if (sortBy === 'receiptDate') return { receiptDate: direction };
    if (sortBy === 'amountReceived') return { amountReceived: direction };
    if (sortBy === 'invoiceNo') return { invoiceNo: direction };

    return { createdAt: 'desc' };
  }
}

