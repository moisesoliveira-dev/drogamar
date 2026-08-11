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

export class ConfigureChannelBodyDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsIn(['GENERIC', 'CUSTOM'])
  platform?: 'GENERIC' | 'CUSTOM';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  credentials?: string | null;
}

export class ListOnlineProductsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn([
    'ALL',
    'PUBLISHED',
    'NOT_PUBLISHED',
    'PENDING',
    'ERROR',
    'UNAVAILABLE',
  ])
  status?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsIn(['ALL', 'WITH_STOCK', 'WITHOUT_STOCK', 'LOW_STOCK'])
  stock?: string;

  @IsOptional()
  @IsIn(['ALL', 'SYNCED', 'PENDING', 'ERROR'])
  sync?: string;

  @IsOptional()
  @IsIn(['ALL', 'NOT_PUBLISHED', 'PUBLISHED', 'UNAVAILABLE'])
  publish?: string;

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

export class UpsertListingBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  commercialName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  shortDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  storeDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  storeCategory?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tags?: string | null;

  @IsOptional()
  @IsBoolean()
  useErpPrice?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceOverride?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  promoPrice?: number | null;

  @IsOptional()
  @IsString()
  promoStartsAt?: string | null;

  @IsOptional()
  @IsString()
  promoEndsAt?: string | null;
}

export class StartSyncBodyDto {
  @IsBoolean()
  syncProducts!: boolean;

  @IsBoolean()
  syncStock!: boolean;

  @IsBoolean()
  syncPrices!: boolean;
}

export class ListSyncJobsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;
}
