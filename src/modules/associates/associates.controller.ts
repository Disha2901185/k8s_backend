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
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import {
  CreateAssociateDto,
  ListAssociatesQueryDto,
  UpdateAssociateDto,
} from 'src/modules/associates/associates.dto';
import { AssociatesService } from 'src/modules/associates/associates.service';

@ApiTags('Associates')
@ApiBearerAuth()
@Controller({ path: 'associates', version: '1' })
export class AssociatesController {
  constructor(private readonly associatesService: AssociatesService) {}

  @Get()
  @Permissions('read:sales.associates')
  @ApiOperation({ summary: 'List tenant associates' })
  listAssociates(@Tenant() tenantId: string, @Query() query: ListAssociatesQueryDto) {
    return this.associatesService.listAssociates(tenantId, query);
  }

  @Get(':id')
  @Permissions('read:sales.associates')
  @ApiOperation({ summary: 'Get associate details' })
  getAssociate(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.associatesService.getAssociate(tenantId, id);
  }

  @Get(':id/summary')
  @Permissions('read:sales.associates')
  @ApiOperation({ summary: 'Get associate performance summary' })
  getAssociateSummary(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.associatesService.getAssociateSummary(tenantId, id);
  }

  @Get(':id/deals')
  @Permissions('read:sales.associates')
  @ApiOperation({ summary: 'Get associate deals for drawer view' })
  getAssociateDeals(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.associatesService.getAssociateDeals(tenantId, id);
  }

  @Get(':id/interactions')
  @Permissions('read:sales.associates')
  @ApiOperation({ summary: 'Get associate interactions for drawer view' })
  getAssociateInteractions(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.associatesService.getAssociateInteractions(tenantId, id);
  }

  @Post()
  @Permissions('write:sales.associates')
  @ApiOperation({ summary: 'Create an associate' })
  createAssociate(@Tenant() tenantId: string, @Body() dto: CreateAssociateDto) {
    return this.associatesService.createAssociate(tenantId, dto);
  }

  @Patch(':id')
  @Permissions('write:sales.associates')
  @ApiOperation({ summary: 'Update an associate' })
  updateAssociate(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssociateDto,
  ) {
    return this.associatesService.updateAssociate(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('write:sales.associates')
  @ApiOperation({ summary: 'Delete an associate' })
  deleteAssociate(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.associatesService.deleteAssociate(tenantId, id);
  }
}
