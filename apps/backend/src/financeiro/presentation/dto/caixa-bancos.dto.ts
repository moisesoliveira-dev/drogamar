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

const KINDS = [
  'CASH',
  'CHECKING',
  'SAVINGS',
  'PAYMENT',
  'BANK',
  'OTHER',
] as const;

export class CaixaBancosPeriodQueryDto {
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
}

export class ListBankAccountsQueryDto extends CaixaBancosPeriodQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ALL', ...KINDS])
  kind?: string;

  @IsOptional()
  @IsIn(['ALL', 'true', 'false'])
  active?: string;

  @IsOptional()
  @IsIn(['1', 'true', '0', 'false'])
  revealSensitive?: string;
}

export class BankAccountDetailQueryDto extends CaixaBancosPeriodQueryDto {
  @IsOptional()
  @IsIn(['1', 'true', '0', 'false'])
  reveal?: string;
}

export class ExtratoQueryDto extends CaixaBancosPeriodQueryDto {
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

export class CreateBankAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string | null;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string | null;

  @IsOptional()
  @IsIn([...KINDS])
  kind?: (typeof KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  agency?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  accountDigit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  openingBalance?: number | null;

  @IsOptional()
  @IsString()
  openingBalanceDate?: string | null;
}

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  bankName?: string | null;

  @IsOptional()
  @IsIn([...KINDS])
  kind?: (typeof KINDS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(40)
  agency?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  accountNumber?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  accountDigit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;
}

export class BankAccountMovementDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.0001)
  amount!: number;

  @IsString()
  occurredAt!: string;

  @IsString()
  @MaxLength(500)
  description!: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  costCenterId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string | null;
}

export class BankAccountTransferDto {
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

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string | null;
}

export class AdjustBalanceDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  targetBalance?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  difference?: number;

  @IsString()
  @MaxLength(1000)
  reason!: string;

  @IsString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string | null;
}

export class BankAccountReasonDto {
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
