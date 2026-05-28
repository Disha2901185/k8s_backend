import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStage, LeadSourceType, LeadStatus } from '@prisma/client';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import {
  ALLOWED_LEAD_SOURCE_TYPES,
  IsAllowedLeadSourceType,
} from 'src/modules/leads/lead-source-types';

export class CreateInboundLeadDto {
  @ApiProperty({ enum: ALLOWED_LEAD_SOURCE_TYPES })
  @IsAllowedLeadSourceType()
  sourceType!: LeadSourceType;

  @ApiProperty()
  @IsString()
  externalSourceId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  messagePreview?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  capturedAt?: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  sourcePayload!: Record<string, unknown>;
}

export class ListLeadsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: ALLOWED_LEAD_SOURCE_TYPES })
  @IsOptional()
  @IsAllowedLeadSourceType()
  sourceType?: LeadSourceType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}

export class UpdateLeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}

export class ManualLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  messagePreview?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;
}

export class CompanyInputDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

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
}

export class ContactInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class AssociateInputDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;
}

export class ConvertLeadToContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty()
  @IsString()
  firstName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;
}

export class ConvertLeadToDealDto {
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
  companyName?: string;

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
  @IsEmail()
  primaryContactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  primaryContactPhone?: string;

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
  @IsEmail()
  associateEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  associatePhone?: string;

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

export class LookupQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
