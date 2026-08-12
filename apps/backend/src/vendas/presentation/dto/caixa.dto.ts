import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class OpenCashSessionDto {
  @IsOptional()
  @IsString()
  registerId?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  openingAmount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CloseCashSessionDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  closingAmount!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
