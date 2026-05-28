import { Module } from '@nestjs/common';
import { AccessControlController } from 'src/modules/access-control/access-control.controller';
import { AccessControlService } from 'src/modules/access-control/access-control.service';

@Module({
  controllers: [AccessControlController],
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
