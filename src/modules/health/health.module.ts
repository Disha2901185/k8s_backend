import { Module } from '@nestjs/common';
import { HealthController } from 'src/modules/health/health.controller';
import { HealthService } from 'src/modules/health/health.service';

@Module({
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
