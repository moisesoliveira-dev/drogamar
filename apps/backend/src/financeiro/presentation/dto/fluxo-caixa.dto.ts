import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CashFlowPeriodQueryDto {
  @IsOptional()
  @IsIn([
    'TODAY',
    'LAST_7',
    'MONTH',
    'PREV_MONTH',
    'NEXT_7',
    'NEXT_MONTH',
    'YEAR',
    'CUSTOM',
  ])
  period?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  costCenterId?: string;
}

export class CashFlowSeriesQueryDto extends CashFlowPeriodQueryDto {
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  groupBy?: string;
}

export class CashFlowProjectionQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  bankAccountId?: string;
}

export class ListCashFlowMovementsQueryDto extends CashFlowPeriodQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALL', 'IN', 'OUT'])
  direction?: string;

  @IsOptional()
  @IsIn(['ALL', 'REALIZED', 'REVERSED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsString()
  kind?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

export class CashFlowAnalysisQueryDto extends CashFlowPeriodQueryDto {
  @IsOptional()
  @IsIn(['IN', 'OUT'])
  direction?: string = 'OUT';
}

export class CreateCashFlowMovementDto {
  @IsIn(['IN', 'OUT'])
  direction!: 'IN' | 'OUT';

  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;

  @IsString()
  occurredAt!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsString()
  bankAccountId!: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  costCenterId?: string | null;

  @IsOptional()
  @IsIn([
    'SALE',
    'PURCHASE',
    'RECEIVABLE',
    'PAYABLE',
    'TRANSFER',
    'MANUAL',
    'OTHER',
  ])
  origin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string | null;
}

export class CreateTransferDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;

  @IsString()
  occurredAt!: string;

  @IsString()
  fromBankAccountId!: string;

  @IsString()
  toBankAccountId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class CashFlowReasonDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
