import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { Tenant } from 'src/common/decorators/tenant.decorator';
import {
  CreateContactDto,
  ListContactsQueryDto,
  UpdateContactDto,
} from 'src/modules/contacts/contacts.dto';
import { ContactsService } from 'src/modules/contacts/contacts.service';

@ApiTags('Contacts')
@ApiBearerAuth()
@Controller({ path: 'contacts', version: '1' })
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Permissions('read:sales.contacts')
  @ApiOperation({ summary: 'List tenant contacts' })
  listContacts(@Tenant() tenantId: string, @Query() query: ListContactsQueryDto) {
    return this.contactsService.listContacts(tenantId, query);
  }

  @Get(':id')
  @Permissions('read:sales.contacts')
  @ApiOperation({ summary: 'Get tenant contact details' })
  getContact(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.contactsService.getContact(tenantId, id);
  }

  @Post()
  @Permissions('write:sales.contacts')
  @ApiOperation({ summary: 'Create a tenant contact' })
  createContact(@Tenant() tenantId: string, @Body() dto: CreateContactDto) {
    return this.contactsService.createContact(tenantId, dto);
  }

  @Patch(':id')
  @Permissions('write:sales.contacts')
  @ApiOperation({ summary: 'Update a tenant contact' })
  updateContact(
    @Tenant() tenantId: string,
    @Param('id') id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.contactsService.updateContact(tenantId, id, dto);
  }

  @Delete(':id')
  @Permissions('write:sales.contacts')
  @ApiOperation({ summary: 'Delete a tenant contact' })
  deleteContact(@Tenant() tenantId: string, @Param('id') id: string) {
    return this.contactsService.deleteContact(tenantId, id);
  }
}
