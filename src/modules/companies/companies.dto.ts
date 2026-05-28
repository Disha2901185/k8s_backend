import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { DealStage } from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export const COMPANY_STATUSES = ['Prospect', 'Client'] as const;

export class ListCompaniesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: COMPANY_STATUSES })
  @IsOptional()
  @IsIn(COMPANY_STATUSES)
  status?: (typeof COMPANY_STATUSES)[number];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit: number = 20;
}

export class CreateCompanyDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ enum: COMPANY_STATUSES })
  @IsOptional()
  @IsIn(COMPANY_STATUSES)
  status?: (typeof COMPANY_STATUSES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

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
  billingCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingZip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeOfSupply?: string;
}

export class UpdateCompanyDto extends CreateCompanyDto {}

export class SaveCompanyDealDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  currency!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ enum: DealStage })
  @IsEnum(DealStage)
  stage!: DealStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryContactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  associateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  associateName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  associateSuccessFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxId?: string;

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
  billingCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  billingZip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;
}
