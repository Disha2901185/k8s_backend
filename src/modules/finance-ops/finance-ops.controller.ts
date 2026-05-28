import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import {
  AutoGenerateWorkOrderSchedulesDto,
  CreateHsnSacCodeDto,
  CreateWorkOrderDto,
  ListClientWorkOrdersQueryDto,
  ListClientsQueryDto,
  ListAllWorkOrdersQueryDto,
  ListAllInvoicesQueryDto,
  ListCollectionProjectionQueryDto,
  ListWorkOrderInvoicesQueryDto,
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
import { FinanceOpsService } from 'src/modules/finance-ops/finance-ops.service';

@ApiTags('Finance Ops')
@ApiBearerAuth()
@Controller({ path: 'finance-ops', version: '1' })
export class FinanceOpsController {
  constructor(private readonly financeOpsService: FinanceOpsService) {}

  @Get('dashboard/kpis')
  @Permissions('read:main.dashboard')
  @ApiOperation({ summary: 'Fetch dashboard KPI cards data with date-range filters' })
  getDashboardKpis(
    @Tenant() tenantId: string,
    @Query() query: GetDashboardKpiQueryDto,
  ) {
    return this.financeOpsService.getDashboardKpis(tenantId, query);
  }

  @Get('clients')
  @Permissions('read:finance-ops.clients')
  @ApiOperation({ summary: 'List finance clients backed by work orders' })
  listClients(@Tenant() tenantId: string, @Query() query: ListClientsQueryDto) {
    return this.financeOpsService.listClients(tenantId, query);
  }

  @Get('clients/options/order-form')
  @Permissions('read:finance-ops.orders')
  @ApiOperation({ summary: 'Load create-order dropdown dependencies' })
  getOrderFormOptions(
    @Tenant() tenantId: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.financeOpsService.getOrderFormOptions(tenantId, clientId);
  }

  @Get('options/item-types')
  @Permissions('read:finance-ops.orders')
  @ApiOperation({ summary: 'Load available work order item types' })
  getItemTypeOptions(@Tenant() tenantId: string) {
    return this.financeOpsService.getItemTypeOptions(tenantId);
  }

  @Get('clients/:id')
  @Permissions('read:finance-ops.clients.details')
  @ApiOperation({ summary: 'Get finance client details and work orders' })
  getClient(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: ListClientWorkOrdersQueryDto,
  ) {
    return this.financeOpsService.getClientDetails(tenantId, id, query);
  }

  @Patch('clients/:id')
  @Permissions('write:finance-ops.clients')
  @ApiOperation({ summary: 'Update finance client details' })
  updateClient(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.financeOpsService.updateClient(tenantId, id, dto);
  }

  @Delete('clients/:id')
  @Permissions('write:finance-ops.clients')
  @ApiOperation({ summary: 'Delete finance client projection' })
  deleteClient(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.financeOpsService.deleteClient(tenantId, id);
  }

  @Post('clients/:id/work-orders')
  @Permissions('write:finance-ops.clients.work-orders.create')
  @ApiOperation({ summary: 'Create a work order for a finance client' })
  createWorkOrder(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: CreateWorkOrderDto,
  ) {
    return this.financeOpsService.createWorkOrder(tenantId, id, dto);
  }

  @Get('work-orders')
  @Permissions('read:finance-ops.orders')
  @ApiOperation({ summary: 'List all work orders across clients' })
  listAllWorkOrders(@Tenant() tenantId: string, @Query() query: ListAllWorkOrdersQueryDto) {
    return this.financeOpsService.listAllWorkOrders(tenantId, query);
  }

  @Get('collection-projection')
  @Permissions('read:finance-ops.collection-projection')
  @ApiOperation({ summary: 'List collection projections for a selected month' })
  listCollectionProjection(@Tenant() tenantId: string, @Query() query: ListCollectionProjectionQueryDto) {
    return this.financeOpsService.listCollectionProjection(tenantId, query);
  }

  @Get('receipts')
  @Permissions('read:finance-ops.receipts')
  @ApiOperation({ summary: 'List all receipts across clients' })
  listAllReceipts(@Tenant() tenantId: string, @Query() query: ListAllReceiptsQueryDto) {
    return this.financeOpsService.listAllReceipts(tenantId, query);
  }

  @Get('invoices')
  @Permissions('read:finance-ops.invoices')
  @ApiOperation({ summary: 'List all invoices across all work orders' })
  listAllInvoices(@Tenant() tenantId: string, @Query() query: ListAllInvoicesQueryDto) {
    return this.financeOpsService.listAllInvoices(tenantId, query);
  }

  @Get('invoices/detail/:id')
  @Permissions('read:finance-ops.invoices')
  @ApiOperation({ summary: 'Get a single invoice by ID' })
  getInvoice(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.financeOpsService.getInvoice(tenantId, id);
  }

  @Get('work-orders/:id')
  @Permissions('read:finance-ops.clients.work-orders.details')
  @ApiOperation({ summary: 'Get work order details' })
  getWorkOrder(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.financeOpsService.getWorkOrder(tenantId, id);
  }

  @Get('options/invoice')
  @Permissions('read:finance-ops.invoices')
  getInvoiceOptions(@Tenant() tenantId: string) {
    return this.financeOpsService.getInvoiceOptions(tenantId);
  }

  @Post('options/invoice/hsn-sac')
  @Permissions('write:finance-ops.invoices')
  createHsnSacCode(
    @Tenant() tenantId: string,
    @Body() dto: CreateHsnSacCodeDto,
  ) {
    return this.financeOpsService.createHsnSacCode(tenantId, dto);
  }

  @Patch('work-orders/:id')
  @Permissions('write:finance-ops.clients.work-orders.details')
  @ApiOperation({ summary: 'Update work order details' })
  updateWorkOrder(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWorkOrderDto,
  ) {
    return this.financeOpsService.updateWorkOrder(tenantId, id, dto);
  }

  @Delete('work-orders/:id')
  @Permissions('write:finance-ops.clients.work-orders.details')
  @ApiOperation({ summary: 'Delete a work order' })
  deleteWorkOrder(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.financeOpsService.deleteWorkOrder(tenantId, id);
  }

  @Get('work-orders/:id/items')
  @Permissions('read:finance-ops.clients.work-orders.items')
  listItems(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: ListWorkOrderItemsQueryDto,
  ) {
    return this.financeOpsService.listItems(tenantId, id, query);
  }

  @Post('work-orders/:id/items')
  @Permissions('write:finance-ops.clients.work-orders.items')
  saveNewItem(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SaveWorkOrderItemDto,
  ) {
    return this.financeOpsService.saveItem(tenantId, id, null, dto);
  }

  @Patch('work-orders/:id/items/:itemId')
  @Permissions('write:finance-ops.clients.work-orders.items')
  saveExistingItem(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: SaveWorkOrderItemDto,
  ) {
    return this.financeOpsService.saveItem(tenantId, id, itemId, dto);
  }

  @Delete('work-orders/:id/items/:itemId')
  @Permissions('write:finance-ops.clients.work-orders.items')
  deleteItem(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.financeOpsService.deleteItem(tenantId, id, itemId);
  }

  @Get('work-orders/:id/schedules')
  @Permissions('read:finance-ops.clients.work-orders.schedules')
  listSchedules(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: ListWorkOrderSchedulesQueryDto,
  ) {
    return this.financeOpsService.listSchedules(tenantId, id, query);
  }

  @Get('work-orders/:id/schedule-item-options')
  @Permissions('read:finance-ops.clients.work-orders.schedules')
  getScheduleItemOptions(
    @Tenant() tenantId: string,
    @Param('id') id: string,
  ) {
    return this.financeOpsService.getScheduleItemOptions(tenantId, id);
  }

  @Post('work-orders/:id/schedules/auto-generate')
  @Permissions('write:finance-ops.clients.work-orders.schedules')
  @ApiOperation({ summary: 'Auto generate schedules for selected work order items' })
  autoGenerateSchedules(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: AutoGenerateWorkOrderSchedulesDto,
  ) {
    return this.financeOpsService.autoGenerateSchedules(tenantId, id, dto);
  }

  @Post('work-orders/:id/schedules')
  @Permissions('write:finance-ops.clients.work-orders.schedules')
  saveNewSchedule(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SaveWorkOrderScheduleDto,
  ) {
    return this.financeOpsService.saveSchedule(tenantId, id, null, dto);
  }

  @Patch('work-orders/:id/schedules/:scheduleId')
  @Permissions('write:finance-ops.clients.work-orders.schedules')
  saveExistingSchedule(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
    @Body() dto: SaveWorkOrderScheduleDto,
  ) {
    return this.financeOpsService.saveSchedule(tenantId, id, scheduleId, dto);
  }

  @Delete('work-orders/:id/schedules/:scheduleId')
  @Permissions('write:finance-ops.clients.work-orders.schedules')
  deleteSchedule(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.financeOpsService.deleteSchedule(tenantId, id, scheduleId);
  }

  @Get('work-orders/:id/invoices')
  @Permissions('read:finance-ops.clients.work-orders.invoices')
  listInvoices(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: ListWorkOrderInvoicesQueryDto,
  ) {
    return this.financeOpsService.listInvoices(tenantId, id, query);
  }

  @Post('work-orders/:id/invoices')
  @Permissions('write:finance-ops.clients.work-orders.invoices')
  saveNewInvoice(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @CurrentUser() currentUser: JwtUser,
    @Body() dto: SaveWorkOrderInvoiceDto,
  ) {
    return this.financeOpsService.saveInvoice(tenantId, id, null, dto, currentUser);
  }

  @Patch('work-orders/:id/invoices/:invoiceId')
  @Permissions('write:finance-ops.clients.work-orders.invoices')
  saveExistingInvoice(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
    @CurrentUser() currentUser: JwtUser,
    @Body() dto: SaveWorkOrderInvoiceDto,
  ) {
    return this.financeOpsService.saveInvoice(tenantId, id, invoiceId, dto, currentUser);
  }

  @Delete('work-orders/:id/invoices/:invoiceId')
  @Permissions('write:finance-ops.clients.work-orders.invoices')
  deleteInvoice(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.financeOpsService.deleteInvoice(tenantId, id, invoiceId);
  }


  @Get('work-orders/:id/receipts')
  @Permissions('read:finance-ops.clients.work-orders.receipts')
  listReceipts(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Query() query: ListWorkOrderReceiptsQueryDto,
  ) {
    return this.financeOpsService.listReceipts(tenantId, id, query);
  }

  @Post('work-orders/:id/receipts')
  @Permissions('write:finance-ops.clients.work-orders.receipts')
  saveNewReceipt(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SaveWorkOrderReceiptDto,
  ) {
    return this.financeOpsService.saveReceipt(tenantId, id, null, dto);
  }

  @Patch('work-orders/:id/receipts/:receiptId')
  @Permissions('write:finance-ops.clients.work-orders.receipts')
  saveExistingReceipt(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('receiptId') receiptId: string,
    @Body() dto: SaveWorkOrderReceiptDto,
  ) {
    return this.financeOpsService.saveReceipt(tenantId, id, receiptId, dto);
  }

  @Delete('work-orders/:id/receipts/:receiptId')
  @Permissions('write:finance-ops.clients.work-orders.receipts')
  deleteReceipt(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('receiptId') receiptId: string,
  ) {
    return this.financeOpsService.deleteReceipt(tenantId, id, receiptId);
  }
}
