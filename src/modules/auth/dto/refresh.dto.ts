import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty()
  @IsString()
  @IsOptional()
  refreshToken?: string;
}
