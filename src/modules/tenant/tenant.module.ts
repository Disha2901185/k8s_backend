import { Module } from '@nestjs/common';
import { TenantController } from 'src/modules/tenant/tenant.controller';
import { TenantRepository } from 'src/modules/tenant/tenant.repository';
import { TenantService } from 'src/modules/tenant/tenant.service';

@Module({
  controllers: [TenantController],
  providers: [TenantRepository, TenantService],
  exports: [TenantRepository, TenantService],
})
export class TenantModule {}
