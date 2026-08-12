import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ListPayablesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  bankAccountId?: string;

  @IsOptional()
  @IsString()
  costCenterId?: string;

  @IsOptional()
  @IsString()
  origin?: string;

  @IsOptional()
  @IsIn(['ALL', 'TODAY', 'WEEK', 'MONTH', 'NEXT_MONTH', 'CUSTOM'])
  period?: string;

  @IsOptional()
  @IsString()
  dueFrom?: string;

  @IsOptional()
  @IsString()
  dueTo?: string;

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

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: 'asc' | 'desc';
}

export class CreatePayableDto {
  @IsString()
  supplierId!: string;

  @IsString()
  @MaxLength(240)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  document?: string | null;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  originalAmount!: number;

  @IsString()
  issueDate!: string;

  @IsString()
  dueDate!: string;

  @IsOptional()
  @IsIn(['MANUAL', 'PURCHASE', 'PURCHASE_ORDER', 'CONTRACT', 'OTHER'])
  origin?: 'MANUAL' | 'PURCHASE' | 'PURCHASE_ORDER' | 'CONTRACT' | 'OTHER';

  @IsOptional()
  @IsString()
  originRef?: string | null;

  @IsOptional()
  @IsString()
  paymentMethodId?: string | null;

  @IsOptional()
  @IsString()
  bankAccountId?: string | null;

  @IsOptional()
  @IsString()
  costCenterId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  installmentCount?: number;

  @IsOptional()
  @IsBoolean()
  requiresApproval?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class RegisterPaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  amount!: number;

  @IsString()
  paidAt!: string;

  @IsOptional()
  @IsString()
  paymentMethodId?: string | null;

  @IsOptional()
  @IsString()
  bankAccountId?: string | null;

  @IsOptional()
  @IsString()
  installmentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  interestAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  fineAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string | null;
}

export class ReversePaymentDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class RenegotiatePayableDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  installmentCount!: number;

  @IsString()
  firstDueDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  interestAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class CancelPayableDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class SchedulePayableDto {
  @IsString()
  scheduledDate!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  paymentMethodId?: string | null;

  @IsOptional()
  @IsString()
  bankAccountId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string | null;
}

export class ApprovalReasonDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}

export class RejectPayableDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}

export class SearchSuppliersQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

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
