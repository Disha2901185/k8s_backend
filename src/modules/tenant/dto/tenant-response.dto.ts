import { ApiProperty } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  legalName?: string | null;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  billingStreet?: string | null;

  @ApiPropertyOptional()
  billingCity?: string | null;

  @ApiPropertyOptional()
  billingState?: string | null;

  @ApiPropertyOptional()
  billingStateCode?: string | null;

  @ApiPropertyOptional()
  billingCountry?: string | null;

  @ApiPropertyOptional()
  billingZip?: string | null;

  @ApiPropertyOptional()
  taxId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
