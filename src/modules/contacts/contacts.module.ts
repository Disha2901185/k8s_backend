import { Module } from '@nestjs/common';
import { ContactsController } from 'src/modules/contacts/contacts.controller';
import { ContactsRepository } from 'src/modules/contacts/contacts.repository';
import { ContactsService } from 'src/modules/contacts/contacts.service';

@Module({
  controllers: [ContactsController],
  providers: [ContactsRepository, ContactsService],
  exports: [ContactsService],
})
export class ContactsModule {}
