import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import {
  CompanyInputDto,
  ConvertLeadToContactDto,
  ConvertLeadToDealDto,
  CreateInboundLeadDto,
  ListLeadsQueryDto,
  ManualLeadDto,
  LookupQueryDto,
  UpdateLeadStatusDto,
} from 'src/modules/leads/leads.dto';
import { LeadsService } from 'src/modules/leads/leads.service';

@ApiTags('Leads')
@Controller({ path: 'leads', version: '1' })
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Public()
  @Post('intake')
  @ApiOperation({ summary: 'Ingest a lead using tenant lead API credentials' })
  @ApiHeader({ name: 'x-lead-client-id', required: true })
  @ApiHeader({ name: 'x-lead-client-secret', required: true })
  intakeLead(
    @Headers('x-lead-client-id') clientId: string | undefined,
    @Headers('x-lead-client-secret') clientSecret: string | undefined,
    @Body() dto: CreateInboundLeadDto,
  ) {
    return this.leadsService.intakeLead(clientId, clientSecret, dto);
  }

  @ApiBearerAuth()
  @Get('options/companies')
  @Permissions('read:sales.leads')
  @ApiOperation({ summary: 'List companies for lead conversion flows' })
  listCompanies(@Tenant() tenantId: string, @Query() query: LookupQueryDto) {
    return this.leadsService.listCompanies(tenantId, query);
  }

  @ApiBearerAuth()
  @Post('options/companies')
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Quick create a company from the leads workflow' })
  createCompany(@Tenant() tenantId: string, @Body() dto: CompanyInputDto) {
    return this.leadsService.createCompany(tenantId, dto);
  }

  @ApiBearerAuth()
  @Get()
  @Permissions('read:sales.leads')
  @ApiOperation({ summary: 'List tenant leads' })
  listLeads(@Tenant() tenantId: string, @Query() query: ListLeadsQueryDto) {
    return this.leadsService.listLeads(tenantId, query);
  }

  @ApiBearerAuth()
  @Post()
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Create a lead manually' })
  createManualLead(@Tenant() tenantId: string, @Body() dto: ManualLeadDto) {
    return this.leadsService.createManualLead(tenantId, dto);
  }

  @ApiBearerAuth()
  @Get(':id')
  @Permissions('read:sales.leads')
  @ApiOperation({ summary: 'Get lead details' })
  getLead(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.leadsService.getLead(tenantId, id);
  }

  @ApiBearerAuth()
  @Patch(':id')
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Update a lead manually' })
  updateManualLead(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ManualLeadDto,
  ) {
    return this.leadsService.updateManualLead(tenantId, id, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Update lead status' })
  updateLeadStatus(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateLeadStatusDto,
  ) {
    return this.leadsService.updateLeadStatus(tenantId, id, dto);
  }

  @ApiBearerAuth()
  @Patch(':id/archive')
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Archive a lead' })
  archiveLead(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.leadsService.archiveLead(tenantId, id);
  }

  @ApiBearerAuth()
  @Post(':id/convert/contact')
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Convert a lead into a contact' })
  convertLeadToContact(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConvertLeadToContactDto,
  ) {
    return this.leadsService.convertLeadToContact(tenantId, id, dto);
  }

  @ApiBearerAuth()
  @Post(':id/convert/deal')
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Convert a lead into a deal' })
  convertLeadToDeal(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: ConvertLeadToDealDto,
  ) {
    return this.leadsService.convertLeadToDeal(tenantId, id, dto);
  }

  @ApiBearerAuth()
  @Delete(':id')
  @Permissions('write:sales.leads')
  @ApiOperation({ summary: 'Soft delete a lead' })
  deleteLead(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.leadsService.deleteLead(tenantId, id);
  }
}
