import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateDealDto {
  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  currency!: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiProperty({ enum: DealStage })
  @IsEnum(DealStage)
  stage!: DealStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryContactId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  associateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
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
  @IsDateString()
  poDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  poEndDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  duration?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poDocumentUrl?: string;
}

export class UpdateDealDto extends CreateDealDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  value!: number;

  @ApiPropertyOptional({ enum: DealStage })
  @IsOptional()
  @IsEnum(DealStage)
  stage!: DealStage;
}
