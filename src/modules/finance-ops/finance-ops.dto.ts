import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export const CLIENT_SORT_FIELDS = [
  'customerName',
  'contactPerson',
  'phone',
  'email',
  'gst',
] as const;

export const WORK_ORDER_SORT_FIELDS = [
  'project',
  'woNumber',
  'woValue',
  'woDate',
  'woPeriod',
] as const;

export const ITEM_SORT_FIELDS = ['itemDetails', 'itemType', 'itemAmount', 'billingFrequency'] as const;
export const SCHEDULE_SORT_FIELDS = ['itemDetails', 'amount', 'scheduleDate'] as const;
export const INVOICE_SORT_FIELDS = ['itemDetails', 'invoiceNo', 'invoiceDate', 'amount', 'tax', 'totalAmount', 'waiveOff', 'waiveOffAmount', 'waiveOffReason'] as const;
export const RECEIPT_SORT_FIELDS = [
  'invoiceNo',
  'receiptDate',
  'amountReceived',
  'tds',
  'chargesAndLevies',
  'withholding',
  'paymentMode',
] as const;

class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit: number = 10;

  @ApiPropertyOptional({ default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDirection: 'asc' | 'desc' = 'asc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  range?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}

export class ListClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CLIENT_SORT_FIELDS })
  @IsOptional()
  @IsIn(CLIENT_SORT_FIELDS)
  sortBy?: (typeof CLIENT_SORT_FIELDS)[number];
}

export class ListClientWorkOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WORK_ORDER_SORT_FIELDS })
  @IsOptional()
  @IsIn(WORK_ORDER_SORT_FIELDS)
  sortBy?: (typeof WORK_ORDER_SORT_FIELDS)[number];
}

export class ListAllWorkOrdersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: WORK_ORDER_SORT_FIELDS })
  @IsOptional()
  @IsIn(WORK_ORDER_SORT_FIELDS)
  sortBy?: (typeof WORK_ORDER_SORT_FIELDS)[number];
}

export class ListCollectionProjectionQueryDto {
  @ApiPropertyOptional({ example: '2026-06' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;
}

export class ListWorkOrderItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ITEM_SORT_FIELDS })
  @IsOptional()
  @IsIn(ITEM_SORT_FIELDS)
  sortBy?: (typeof ITEM_SORT_FIELDS)[number];
}

export class ListWorkOrderSchedulesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SCHEDULE_SORT_FIELDS })
  @IsOptional()
  @IsIn(SCHEDULE_SORT_FIELDS)
  sortBy?: (typeof SCHEDULE_SORT_FIELDS)[number];
}

export class ListWorkOrderInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_SORT_FIELDS })
  @IsOptional()
  @IsIn(INVOICE_SORT_FIELDS)
  sortBy?: (typeof INVOICE_SORT_FIELDS)[number];
}

export class ListWorkOrderReceiptsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RECEIPT_SORT_FIELDS })
  @IsOptional()
  @IsIn(RECEIPT_SORT_FIELDS)
  sortBy?: (typeof RECEIPT_SORT_FIELDS)[number];
}

export class ListAllReceiptsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: RECEIPT_SORT_FIELDS })
  @IsOptional()
  @IsIn(RECEIPT_SORT_FIELDS)
  sortBy?: (typeof RECEIPT_SORT_FIELDS)[number];
}

export class ListAllInvoicesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: INVOICE_SORT_FIELDS })
  @IsOptional()
  @IsIn(INVOICE_SORT_FIELDS)
  sortBy?: (typeof INVOICE_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['Received', 'Partially Received', 'Pending', 'Overdue'] })
  @IsOptional()
  @IsIn(['Received', 'Partially Received', 'Pending', 'Overdue', 'Paid'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class UpdateClientDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  customerName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gst?: string;
}

export class WorkOrderItemInputDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemDetails!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemType!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  billingFrequency!: string;
}

export class WorkOrderScheduleInputDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderItemId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemDetails!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsDateString()
  scheduleDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  installmentLabel?: string;
}

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  projectName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  woNumber!: string;

  @ApiProperty()
  @IsDateString()
  woDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  woValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  poExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poDocumentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @ApiProperty({ type: [WorkOrderItemInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderItemInputDto)
  items!: WorkOrderItemInputDto[];

  @ApiProperty({ type: [WorkOrderScheduleInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderScheduleInputDto)
  schedule!: WorkOrderScheduleInputDto[];
}

export class UpdateWorkOrderDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  projectName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectType?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  woNumber!: string;

  @ApiProperty()
  @IsDateString()
  woDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  woValue!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  poExpiry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  poDocumentUrl?: string;
}

export class SaveWorkOrderItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemDetails!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemType!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  itemAmount!: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  billingFrequency!: string;
}

export class SaveWorkOrderScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderItemId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemDetails!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount!: number;

  @ApiProperty()
  @IsDateString()
  scheduleDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  installmentLabel?: string;
}

export class AutoGenerateWorkOrderSchedulesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  itemIds!: string[];
}

export class CreateHsnSacCodeDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  code!: string;
}

export class SaveWorkOrderInvoiceItemDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemLabel!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workOrderScheduleId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hsnSac?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  qty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxLabel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class SaveWorkOrderInvoiceDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  itemDetails!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  invoiceNo?: string;

  @ApiProperty()
  @IsDateString()
  invoiceDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tax!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  waiveOff?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  waiveOffAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  waiveOffReason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  taxType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gstPercent?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  igstAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  cgstAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sgstAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  createdFromInvoiceBuilder?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  savedAndDownloaded?: boolean;

  @ApiPropertyOptional({ type: [SaveWorkOrderInvoiceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveWorkOrderInvoiceItemDto)
  invoiceItems?: SaveWorkOrderInvoiceItemDto[];
}

export class SaveWorkOrderReceiptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  invoiceId?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  invoiceNo!: string;

  @ApiProperty()
  @IsDateString()
  receiptDate!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amountReceived!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  tds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chargesAndLevies?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  withholding?: number;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  paymentMode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  details?: string;
}

export class GetDashboardKpiQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  range?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
