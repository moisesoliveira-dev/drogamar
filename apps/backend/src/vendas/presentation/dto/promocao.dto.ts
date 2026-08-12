import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertPromotionDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(['PERCENT', 'FIXED', 'PROMO_PRICE', 'MIN_PURCHASE'])
  type!: 'PERCENT' | 'FIXED' | 'PROMO_PRICE' | 'MIN_PURCHASE';

  @IsEnum(['ALL', 'PRODUCTS', 'CATEGORIES', 'BRANDS'])
  scope!: 'ALL' | 'PRODUCTS' | 'CATEGORIES' | 'BRANDS';

  @IsEnum(['STACKABLE', 'EXCLUSIVE'])
  stacking!: 'STACKABLE' | 'EXCLUSIVE';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9999)
  priority!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  @Max(100)
  percentOff?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  amountOff?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  promoPrice?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  minCartValue?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  minQuantity?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  maxQtyPerSale?: number | null;

  @IsString()
  startsAt!: string;

  @IsString()
  endsAt!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetIds?: string[];
}

export class PromotionListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class SimulatePromotionDto {
  @IsString()
  stockItemId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity!: number;

  @IsOptional()
  @IsString()
  promotionId?: string;
}

export class ApproveCartDiscountDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  cartDiscount!: number;

  @IsString()
  @MinLength(3)
  reason!: string;
}
