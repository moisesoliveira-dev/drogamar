import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class ListCobrancasQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  financialStatus?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  daysBucket?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  amountMax?: number;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsIn(['ALL', 'TODAY', 'WEEK', 'LAST_7', 'MONTH', 'PREV_MONTH', 'YEAR'])
  period?: string;

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

export class PeriodQueryDto {
  @IsOptional()
  @IsIn(['ALL', 'TODAY', 'WEEK', 'LAST_7', 'MONTH', 'PREV_MONTH', 'YEAR'])
  period?: string = 'MONTH';
}

export class CreateCollectionCaseDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  receivableIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  assigneeId?: string | null;
}

export class RegisterContactDto {
  @IsIn(['PHONE', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'OTHER'])
  channel!: 'PHONE' | 'WHATSAPP' | 'EMAIL' | 'SMS' | 'IN_PERSON' | 'OTHER';

  @IsIn([
    'NO_ANSWER',
    'ANSWERED',
    'REQUESTED_DEADLINE',
    'DISPUTED',
    'PROMISED_PAYMENT',
    'PAID',
    'INVALID_NUMBER',
    'INVALID_EMAIL',
    'OTHER',
  ])
  outcome!:
    | 'NO_ANSWER'
    | 'ANSWERED'
    | 'REQUESTED_DEADLINE'
    | 'DISPUTED'
    | 'PROMISED_PAYMENT'
    | 'PAID'
    | 'INVALID_NUMBER'
    | 'INVALID_EMAIL'
    | 'OTHER';

  @IsOptional()
  @IsString()
  contactedAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsIn([
    'CALL',
    'WHATSAPP',
    'EMAIL',
    'WAIT_PAYMENT',
    'CHECK_PROMISE',
    'NEGOTIATE',
    'CLOSE',
    'OTHER',
  ])
  nextAction?:
    | 'CALL'
    | 'WHATSAPP'
    | 'EMAIL'
    | 'WAIT_PAYMENT'
    | 'CHECK_PROMISE'
    | 'NEGOTIATE'
    | 'CLOSE'
    | 'OTHER'
    | null;

  @IsOptional()
  @IsString()
  nextActionAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  nextActionNotes?: string | null;
}

export class CreatePromiseDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  promisedAmount!: number;

  @IsString()
  promisedDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class AssignDto {
  @ValidateIf((_, v) => v != null)
  @IsString()
  assigneeId!: string | null;
}

export class NextActionDto {
  @IsIn([
    'CALL',
    'WHATSAPP',
    'EMAIL',
    'WAIT_PAYMENT',
    'CHECK_PROMISE',
    'NEGOTIATE',
    'CLOSE',
    'OTHER',
  ])
  nextAction!:
    | 'CALL'
    | 'WHATSAPP'
    | 'EMAIL'
    | 'WAIT_PAYMENT'
    | 'CHECK_PROMISE'
    | 'NEGOTIATE'
    | 'CLOSE'
    | 'OTHER';

  @IsOptional()
  @IsString()
  nextActionAt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}

export class ReasonDto {
  @IsString()
  @MaxLength(2000)
  reason!: string;
}

export class ResolveCaseDto {
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string | null;
}

export class AcordoDto {
  @IsString()
  receivableId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  installmentCount!: number;

  @IsString()
  firstDueDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  interestAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  discountAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;
}
