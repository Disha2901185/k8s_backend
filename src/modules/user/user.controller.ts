import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import { JwtUser } from 'src/modules/auth/interfaces/jwt-user.interface';
import { CreateUserDto } from 'src/modules/user/dto/create-user.dto';
import { UpdateUserDto } from 'src/modules/user/dto/update-user.dto';
import { UserResponseDto } from 'src/modules/user/dto/user-response.dto';
import { UserService } from 'src/modules/user/user.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Permissions('create:users')
  @ApiOperation({ summary: 'Create Tenant User' })
  @ApiCreatedResponse({ type: UserResponseDto })
  create(
    @Tenant() tenantId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.userService.create(tenantId, dto, currentUser);
  }

  @Get()
  @Permissions('read:users')
  @ApiOperation({ summary: 'List Tenant Users' })
  @ApiOkResponse({ type: [UserResponseDto] })
  findAll(@Tenant() tenantId: string) {
    return this.userService.findAll(tenantId);
  }

  @Get(':id')
  @Permissions('read:users')
  @ApiOperation({ summary: 'Get Tenant User By Id' })
  @ApiOkResponse({ type: UserResponseDto })
  findOne(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.userService.findOne(tenantId, id);
  }

  @Patch(':id')
  @Permissions('update:users')
  @ApiOperation({ summary: 'Update Tenant User' })
  @ApiOkResponse({ type: UserResponseDto })
  update(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() currentUser: JwtUser,
  ) {
    return this.userService.update(tenantId, id, dto, currentUser);
  }

  @Delete(':id')
  @Permissions('delete:users')
  @ApiOperation({ summary: 'Delete Tenant User' })
  delete(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.userService.softDelete(tenantId, id);
  }
}
