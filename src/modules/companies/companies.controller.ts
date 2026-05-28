import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import {
  CreateCompanyDto,
  ListCompaniesQueryDto,
  SaveCompanyDealDto,
  UpdateCompanyDto,
} from 'src/modules/companies/companies.dto';
import { CompaniesService } from 'src/modules/companies/companies.service';

@ApiTags('Companies')
@ApiBearerAuth()
@Controller({ path: 'companies', version: '1' })
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  @Permissions('read:sales.companies')
  @ApiOperation({ summary: 'List tenant companies' })
  listCompanies(@Tenant() tenantId: string, @Query() query: ListCompaniesQueryDto) {
    return this.companiesService.listCompanies(tenantId, query);
  }

  @Get(':id')
  @Permissions('read:sales.companies')
  @ApiOperation({ summary: 'Get tenant company details' })
  getCompany(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.companiesService.getCompany(tenantId, id);
  }

  @Post(':id/deals')
  @Permissions('write:sales.companies')
  @ApiOperation({ summary: 'Create a deal for a tenant company' })
  createCompanyDeal(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: SaveCompanyDealDto,
  ) {
    return this.companiesService.createCompanyDeal(tenantId, id, dto);
  }

  @Patch(':id/deals/:dealId')
  @Permissions('write:sales.companies')
  @ApiOperation({ summary: 'Update a deal for a tenant company' })
  updateCompanyDeal(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('dealId') dealId: string,
    @Body() dto: SaveCompanyDealDto,
  ) {
    return this.companiesService.updateCompanyDeal(tenantId, id, dealId, dto);
  }

  @Delete(':id/deals/:dealId')
  @Permissions('write:sales.companies')
  @ApiOperation({ summary: 'Delete a deal for a tenant company' })
  deleteCompanyDeal(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Param('dealId') dealId: string,
  ) {
    return this.companiesService.deleteCompanyDeal(tenantId, id, dealId);
  }

  @Post()
  @Permissions('write:sales.companies')
  @ApiOperation({ summary: 'Create a tenant company' })
  createCompany(@Tenant() tenantId: string, @Body() dto: CreateCompanyDto) {
    return this.companiesService.createCompany(tenantId, dto);
  }

  @Patch(':id')
  @Permissions('write:sales.companies')
  @ApiOperation({ summary: 'Update a tenant company' })
  updateCompany(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companiesService.updateCompany(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('write:sales.companies')
  @ApiOperation({ summary: 'Delete a tenant company' })
  deleteCompany(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.companiesService.deleteCompany(tenantId, id);
  }
}
