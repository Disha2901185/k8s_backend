import { Module } from '@nestjs/common';
import { LeadsController } from 'src/modules/leads/leads.controller';
import { LeadsRepository } from 'src/modules/leads/leads.repository';
import { LeadsService } from 'src/modules/leads/leads.service';

@Module({
  controllers: [LeadsController],
  providers: [LeadsRepository, LeadsService],
})
export class LeadsModule {}
