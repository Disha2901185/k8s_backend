import { Module } from '@nestjs/common';
import { CompaniesController } from 'src/modules/companies/companies.controller';
import { CompaniesRepository } from 'src/modules/companies/companies.repository';
import { CompaniesService } from 'src/modules/companies/companies.service';

@Module({
  controllers: [CompaniesController],
  providers: [CompaniesRepository, CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}
