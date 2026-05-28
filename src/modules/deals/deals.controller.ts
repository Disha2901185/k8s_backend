import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto, UpdateDealDto } from './deals.dto';

@ApiTags('Deals')
@Controller({ path: 'deals', version: '1' })
@ApiBearerAuth()
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  @Permissions('read:sales.pipeline')
  @ApiOperation({ summary: 'List all deals for a tenant' })
  listDeals(@Tenant() tenantId: string) {
    return this.dealsService.listDeals(tenantId);
  }

  @Get(':id')
  @Permissions('read:sales.pipeline')
  @ApiOperation({ summary: 'Get deal details' })
  getDeal(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.dealsService.getDeal(tenantId, id);
  }

  @Get(':id/work-order')
  @Permissions('read:sales.pipeline')
  @ApiOperation({ summary: 'Get work order details for a deal' })
  getWorkOrder(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.dealsService.getWorkOrder(tenantId, id);
  }

  @Post()
  @Permissions('write:sales.pipeline')
  @ApiOperation({ summary: 'Create a new deal' })
  createDeal(@Tenant() tenantId: string, @Body() dto: CreateDealDto) {
    return this.dealsService.createDeal(tenantId, dto);
  }

  @Patch(':id')
  @Permissions('write:sales.pipeline')
  @ApiOperation({ summary: 'Update an existing deal' })
  updateDeal(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDealDto,
  ) {
    return this.dealsService.updateDeal(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('write:sales.pipeline')
  @ApiOperation({ summary: 'Soft delete a deal' })
  deleteDeal(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.dealsService.deleteDeal(tenantId, id);
  }
}
