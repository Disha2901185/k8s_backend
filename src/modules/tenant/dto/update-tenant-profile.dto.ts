import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTenantProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingStreet?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingStateCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingZip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;
}
