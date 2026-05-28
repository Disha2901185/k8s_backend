import { Module } from '@nestjs/common';
import { AssociatesController } from 'src/modules/associates/associates.controller';
import { AssociatesRepository } from 'src/modules/associates/associates.repository';
import { AssociatesService } from 'src/modules/associates/associates.service';

@Module({
  controllers: [AssociatesController],
  providers: [AssociatesRepository, AssociatesService],
  exports: [AssociatesService],
})
export class AssociatesModule {}
