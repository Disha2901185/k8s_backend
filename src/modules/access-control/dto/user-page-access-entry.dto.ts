import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString } from 'class-validator';

export class UserPageAccessEntryDto {
  @ApiProperty()
  @IsString()
  pageId!: string;

  @ApiProperty()
  @IsBoolean()
  canRead!: boolean;

  @ApiProperty()
  @IsBoolean()
  canWrite!: boolean;
}
