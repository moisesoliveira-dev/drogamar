import type { StockItem } from '../../domain/stock-item';
import type { StockItemRelations } from '../../domain/ports/stock-item.repository';

export type StockItemDto = {
  id: string;
  code: string;
  description: string;
  sku: string | null;
  barcode: string | null;
  status: string;
  itemType: string;
  categoryId: string | null;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  locationId: string | null;
  locationName: string | null;
  measureUnitId: string | null;
  measureUnitCode: string | null;
  measureUnitLabel: string | null;
  purchaseUnitId: string | null;
  purchaseUnitCode: string | null;
  saleUnitId: string | null;
  saleUnitCode: string | null;
  purchaseToMeasureFactor: number | null;
  saleToMeasureFactor: number | null;
  trackStock: boolean;
  minStock: number | null;
  maxStock: number | null;
  currentStock: number;
  trackLot: boolean;
  trackExpiry: boolean;
  costPrice: number | null;
  salePrice: number | null;
  marginPercent: number | null;
  ncm: string | null;
  cest: string | null;
  origin: string | null;
  defaultCfop: string | null;
  fiscalUnit: string | null;
  complementaryDescription: string | null;
  notes: string | null;
  manufacturer: string | null;
  mainSupplier: string | null;
  createdAt: string;
  updatedAt: string;
};

function marginPercent(
  cost: number | null,
  sale: number | null,
): number | null {
  if (cost == null || sale == null || cost <= 0) return null;
  return Number((((sale - cost) / cost) * 100).toFixed(2));
}

export function toStockItemDto(
  item: StockItem,
  relations?: Partial<StockItemRelations>,
): StockItemDto {
  const p = item.props;
  return {
    id: p.id,
    code: p.code,
    description: p.description,
    sku: p.sku,
    barcode: p.barcode,
    status: p.status,
    itemType: p.itemType,
    categoryId: p.categoryId,
    categoryName: relations?.categoryName ?? null,
    brandId: p.brandId,
    brandName: relations?.brandName ?? null,
    locationId: p.locationId,
    locationName: relations?.locationName ?? null,
    measureUnitId: p.measureUnitId,
    measureUnitCode: relations?.measureUnitCode ?? null,
    measureUnitLabel: relations?.measureUnitLabel ?? null,
    purchaseUnitId: p.purchaseUnitId,
    purchaseUnitCode: relations?.purchaseUnitCode ?? null,
    saleUnitId: p.saleUnitId,
    saleUnitCode: relations?.saleUnitCode ?? null,
    purchaseToMeasureFactor: p.purchaseToMeasureFactor,
    saleToMeasureFactor: p.saleToMeasureFactor,
    trackStock: p.trackStock,
    minStock: p.minStock,
    maxStock: p.maxStock,
    currentStock: p.currentStock,
    trackLot: p.trackLot,
    trackExpiry: p.trackExpiry,
    costPrice: p.costPrice,
    salePrice: p.salePrice,
    marginPercent: marginPercent(p.costPrice, p.salePrice),
    ncm: p.ncm,
    cest: p.cest,
    origin: p.origin,
    defaultCfop: p.defaultCfop,
    fiscalUnit: p.fiscalUnit,
    complementaryDescription: p.complementaryDescription,
    notes: p.notes,
    manufacturer: p.manufacturer,
    mainSupplier: p.mainSupplier,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}
