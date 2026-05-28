import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { AccessControlService } from 'src/modules/access-control/access-control.service';
import { AccessAuditQueryDto } from 'src/modules/access-control/dto/access-audit-query.dto';
import { AssignUserRolesDto } from 'src/modules/access-control/dto/assign-user-roles.dto';
import { CreateRoleDto } from 'src/modules/access-control/dto/create-role.dto';
import { UpdateRoleDto } from 'src/modules/access-control/dto/update-role.dto';
import { UpdateUserPageAccessDto } from 'src/modules/access-control/dto/update-user-page-access.dto';

@ApiTags('Access Control')
@ApiBearerAuth()
@Controller({ path: 'access-control', version: '1' })
export class AccessControlController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get('permissions/catalog')
  @Roles('admin')
  @ApiOperation({ summary: 'Get Purchased Permission Catalog' })
  @ApiOkResponse()
  getPermissionCatalog(@Tenant() tenantId: string) {
    return this.accessControlService.getPermissionCatalog(tenantId);
  }

  @Get('modules')
  @Roles('admin')
  @ApiOperation({ summary: 'List Purchased Modules And Pages' })
  @ApiOkResponse()
  getModules(@Tenant() tenantId: string) {
    return this.accessControlService.getModules(tenantId);
  }

  @Get('navigation')
  @ApiOperation({ summary: 'Get User Navigation' })
  @ApiOkResponse()
  getNavigation(@Tenant() tenantId: string, @CurrentUser() currentUser: JwtUser) {
    return this.accessControlService.getNavigation(tenantId, currentUser);
  }

  @Get('roles')
  @Roles('admin')
  @ApiOperation({ summary: 'List Tenant Roles' })
  @ApiOkResponse()
  getRoles(@Tenant() tenantId: string) {
    return this.accessControlService.getRoles(tenantId);
  }

  @Post('roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Create Role' })
  @ApiOkResponse()
  createRole(
    @Tenant() tenantId: string,
    @CurrentUser() currentUser: JwtUser,
    @Body() dto: CreateRoleDto,
  ) {
    return this.accessControlService.createRole(tenantId, currentUser, dto);
  }

  @Patch('roles/:roleId')
  @Roles('admin')
  @ApiOperation({ summary: 'Update Role' })
  @ApiOkResponse()
  updateRole(
    @Tenant() tenantId: string,
    @Param('roleId') roleId: string,
    @CurrentUser() currentUser: JwtUser,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.accessControlService.updateRole(tenantId, roleId, currentUser, dto);
  }

  @Post('users/:userId/roles')
  @Roles('admin')
  @ApiOperation({ summary: 'Assign Roles To User' })
  @ApiOkResponse()
  assignUserRoles(
    @Tenant() tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: JwtUser,
    @Body() dto: AssignUserRolesDto,
  ) {
    return this.accessControlService.assignUserRoles(tenantId, userId, currentUser, dto);
  }

  @Get('users/:userId/page-access')
  @Roles('admin')
  @ApiOperation({ summary: 'Get User Page Access Matrix' })
  @ApiOkResponse()
  getUserPageAccess(@Tenant() tenantId: string, @Param('userId') userId: string) {
    return this.accessControlService.getUserPageAccess(tenantId, userId);
  }

  @Patch('users/:userId/page-access')
  @Roles('admin')
  @ApiOperation({ summary: 'Update User Page Access' })
  @ApiOkResponse()
  updateUserPageAccess(
    @Tenant() tenantId: string,
    @Param('userId') userId: string,
    @CurrentUser() currentUser: JwtUser,
    @Body() dto: UpdateUserPageAccessDto,
  ) {
    return this.accessControlService.updateUserPageAccess(tenantId, userId, currentUser, dto);
  }

  @Get('audit')
  @Roles('admin')
  @ApiOperation({ summary: 'Get Access Audit Log' })
  @ApiOkResponse()
  getAuditLog(@Tenant() tenantId: string, @Query() query: AccessAuditQueryDto) {
    return this.accessControlService.getAuditLog(tenantId, query);
  }
}
