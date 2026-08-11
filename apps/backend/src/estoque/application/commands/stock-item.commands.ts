import type { StockItemStatus, StockItemType } from '../../domain/stock-item';

export type UpsertStockItemInput = {
  code?: string | null;
  description: string;
  sku?: string | null;
  barcode?: string | null;
  status?: StockItemStatus;
  itemType?: StockItemType;
  categoryId?: string | null;
  brandId?: string | null;
  locationId?: string | null;
  measureUnitId?: string | null;
  purchaseUnitId?: string | null;
  saleUnitId?: string | null;
  purchaseToMeasureFactor?: number | null;
  saleToMeasureFactor?: number | null;
  trackStock?: boolean;
  minStock?: number | null;
  maxStock?: number | null;
  initialStock?: number | null;
  trackLot?: boolean;
  trackExpiry?: boolean;
  costPrice?: number | null;
  salePrice?: number | null;
  ncm?: string | null;
  cest?: string | null;
  origin?: string | null;
  defaultCfop?: string | null;
  fiscalUnit?: string | null;
  complementaryDescription?: string | null;
  notes?: string | null;
  manufacturer?: string | null;
  mainSupplier?: string | null;
};

export class CreateStockItemCommand {
  constructor(readonly input: UpsertStockItemInput) {}
}

export class UpdateStockItemCommand {
  constructor(
    readonly id: string,
    readonly input: UpsertStockItemInput,
  ) {}
}

export class DuplicateStockItemCommand {
  constructor(readonly id: string) {}
}

export class DeactivateStockItemCommand {
  constructor(readonly id: string) {}
}

export class ActivateStockItemCommand {
  constructor(readonly id: string) {}
}

export class DeleteStockItemCommand {
  constructor(readonly id: string) {}
}
