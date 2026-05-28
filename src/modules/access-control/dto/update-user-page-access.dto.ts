import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { UserPageAccessEntryDto } from 'src/modules/access-control/dto/user-page-access-entry.dto';

export class UpdateUserPageAccessDto {
  @ApiProperty({ type: [UserPageAccessEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPageAccessEntryDto)
  entries!: UserPageAccessEntryDto[];
}
