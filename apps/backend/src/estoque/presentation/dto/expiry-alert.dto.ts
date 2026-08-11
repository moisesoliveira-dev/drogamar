import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

enum ExpiryStatusFilterDto {
  ALL = 'ALL',
  EXPIRED = 'EXPIRED',
  EXPIRES_TODAY = 'EXPIRES_TODAY',
  EXPIRES_IN_7 = 'EXPIRES_IN_7',
  EXPIRES_IN_15 = 'EXPIRES_IN_15',
  EXPIRES_IN_30 = 'EXPIRES_IN_30',
  ATTENTION = 'ATTENTION',
  REGULAR = 'REGULAR',
}

enum ExpirySortByDto {
  expiryDate = 'expiryDate',
  daysRemaining = 'daysRemaining',
  quantity = 'quantity',
  valueAtRisk = 'valueAtRisk',
  item = 'item',
}

enum SortDirDto {
  asc = 'asc',
  desc = 'desc',
}

export class ListExpiryAlertsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  alertWindowDays?: number;

  @IsOptional()
  @IsEnum(ExpiryStatusFilterDto)
  status?: ExpiryStatusFilterDto;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsDateString()
  expiryFrom?: string;

  @IsOptional()
  @IsDateString()
  expiryTo?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  onlyWithQuantity?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @IsOptional()
  @IsEnum(ExpirySortByDto)
  sortBy?: ExpirySortByDto;

  @IsOptional()
  @IsEnum(SortDirDto)
  sortDir?: SortDirDto;
}
