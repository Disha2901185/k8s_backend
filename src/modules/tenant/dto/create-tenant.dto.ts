import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(80)
  slug!: string;
}
