import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExportBodyDto {
  @IsIn(['ITEMS', 'LOTS_EXPIRY', 'CURRENT_STOCK', 'CATEGORIES', 'ONLINE_STORE'])
  type!: 'ITEMS' | 'LOTS_EXPIRY' | 'CURRENT_STOCK' | 'CATEGORIES' | 'ONLINE_STORE';

  @IsIn(['XLSX', 'CSV', 'PDF'])
  format!: 'XLSX' | 'CSV' | 'PDF';

  @IsObject()
  filters!: Record<string, unknown>;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  columns!: string[];

  @IsString()
  sortBy!: string;

  @IsIn(['asc', 'desc'])
  sortDir!: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  @MaxLength(160)
  fileName?: string;
}

export class PreviewExportBodyDto {
  @IsIn(['ITEMS', 'LOTS_EXPIRY', 'CURRENT_STOCK', 'CATEGORIES', 'ONLINE_STORE'])
  type!: 'ITEMS' | 'LOTS_EXPIRY' | 'CURRENT_STOCK' | 'CATEGORIES' | 'ONLINE_STORE';

  @IsObject()
  filters!: Record<string, unknown>;

  @IsString()
  sortBy!: string;

  @IsIn(['asc', 'desc'])
  sortDir!: 'asc' | 'desc';
}

export class ListExportsQueryDto {
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
  pageSize?: number = 10;
}
