import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

enum StockItemStatusDto {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

enum StockItemTypeDto {
  PRODUCT = 'PRODUCT',
  RAW_MATERIAL = 'RAW_MATERIAL',
  PACKAGING = 'PACKAGING',
  SERVICE = 'SERVICE',
  OTHER = 'OTHER',
}

export class UpsertStockItemBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  code?: string | null;

  @IsString()
  @MinLength(1, { message: 'Descrição é obrigatória.' })
  @MaxLength(255)
  description!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  sku?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  barcode?: string | null;

  @IsOptional()
  @IsEnum(StockItemStatusDto)
  status?: StockItemStatusDto;

  @IsOptional()
  @IsEnum(StockItemTypeDto)
  itemType?: StockItemTypeDto;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  brandId?: string | null;

  @IsOptional()
  @IsString()
  locationId?: string | null;

  @IsOptional()
  @IsString()
  measureUnitId?: string | null;

  @IsOptional()
  @IsString()
  purchaseUnitId?: string | null;

  @IsOptional()
  @IsString()
  saleUnitId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  purchaseToMeasureFactor?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  saleToMeasureFactor?: number | null;

  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minStock?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxStock?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  initialStock?: number | null;

  @IsOptional()
  @IsBoolean()
  trackLot?: boolean;

  @IsOptional()
  @IsBoolean()
  trackExpiry?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  salePrice?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  ncm?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  cest?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  origin?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  defaultCfop?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  fiscalUnit?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  complementaryDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manufacturer?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  mainSupplier?: string | null;
}

enum SortByDto {
  code = 'code',
  description = 'description',
  sku = 'sku',
  currentStock = 'currentStock',
  minStock = 'minStock',
  status = 'status',
  createdAt = 'createdAt',
  updatedAt = 'updatedAt',
}

enum SortDirDto {
  asc = 'asc',
  desc = 'desc',
}

export class ListStockItemsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StockItemStatusDto)
  status?: StockItemStatusDto;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  brandId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  measureUnitId?: string;

  @IsOptional()
  @IsEnum(StockItemTypeDto)
  itemType?: StockItemTypeDto;

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
  @IsEnum(SortByDto)
  sortBy?: SortByDto;

  @IsOptional()
  @IsEnum(SortDirDto)
  sortDir?: SortDirDto;
}
