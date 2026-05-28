import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import { CreateTenantDto } from 'src/modules/tenant/dto/create-tenant.dto';
import { TenantResponseDto } from 'src/modules/tenant/dto/tenant-response.dto';
import { UpdateTenantProfileDto } from 'src/modules/tenant/dto/update-tenant-profile.dto';
import { TenantService } from 'src/modules/tenant/tenant.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('Tenant')
@Controller({ path: 'tenants', version: '1' })
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create Tenant' })
  @ApiCreatedResponse({ type: TenantResponseDto })
  create(@Body() dto: CreateTenantDto) {
    return this.tenantService.createTenant(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Tenant By Id' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: TenantResponseDto })
  getTenant(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.tenantService.getTenant(tenantId, id);
  }

  @Patch(':id/profile')
  @Roles('admin')
  @Permissions('write:system.tenant-profile')
  @ApiOperation({ summary: 'Update Tenant Profile' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: TenantResponseDto })
  updateTenantProfile(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTenantProfileDto,
  ) {
    return this.tenantService.updateTenantProfile(tenantId, id, dto);
  }
}
