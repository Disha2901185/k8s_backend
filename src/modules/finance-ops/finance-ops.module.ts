import { Module } from '@nestjs/common';
import { FinanceOpsController } from 'src/modules/finance-ops/finance-ops.controller';
import { FinanceOpsRepository } from 'src/modules/finance-ops/finance-ops.repository';
import { FinanceOpsService } from 'src/modules/finance-ops/finance-ops.service';

@Module({
  controllers: [FinanceOpsController],
  providers: [FinanceOpsRepository, FinanceOpsService],
  exports: [FinanceOpsService],
})
export class FinanceOpsModule {}
