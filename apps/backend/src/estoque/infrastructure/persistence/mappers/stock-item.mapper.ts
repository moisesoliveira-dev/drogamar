import type { Prisma } from '@prisma/client';
import {
  StockItem,
  type StockItemProps,
  type StockItemStatus,
  type StockItemType,
} from '../../../domain/stock-item';
import type { StockItemRelations } from '../../../domain/ports/stock-item.repository';

type StockItemRow = {
  id: string;
  code: string;
  description: string;
  sku: string | null;
  barcode: string | null;
  status: StockItemStatus;
  itemType: StockItemType;
  categoryId: string | null;
  brandId: string | null;
  locationId: string | null;
  measureUnitId: string | null;
  purchaseUnitId: string | null;
  saleUnitId: string | null;
  purchaseToMeasureFactor: Prisma.Decimal | null;
  saleToMeasureFactor: Prisma.Decimal | null;
  trackStock: boolean;
  minStock: Prisma.Decimal | null;
  maxStock: Prisma.Decimal | null;
  currentStock: Prisma.Decimal;
  trackLot: boolean;
  trackExpiry: boolean;
  costPrice: Prisma.Decimal | null;
  salePrice: Prisma.Decimal | null;
  ncm: string | null;
  cest: string | null;
  origin: string | null;
  defaultCfop: string | null;
  fiscalUnit: string | null;
  complementaryDescription: string | null;
  notes: string | null;
  manufacturer: string | null;
  mainSupplier: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function dec(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  return Number(value.toString());
}

function decReq(value: Prisma.Decimal): number {
  return Number(value.toString());
}

export function toDomain(row: StockItemRow): StockItem {
  const props: StockItemProps = {
    id: row.id,
    code: row.code,
    description: row.description,
    sku: row.sku,
    barcode: row.barcode,
    status: row.status,
    itemType: row.itemType,
    categoryId: row.categoryId,
    brandId: row.brandId,
    locationId: row.locationId,
    measureUnitId: row.measureUnitId,
    purchaseUnitId: row.purchaseUnitId,
    saleUnitId: row.saleUnitId,
    purchaseToMeasureFactor: dec(row.purchaseToMeasureFactor),
    saleToMeasureFactor: dec(row.saleToMeasureFactor),
    trackStock: row.trackStock,
    minStock: dec(row.minStock),
    maxStock: dec(row.maxStock),
    currentStock: decReq(row.currentStock),
    trackLot: row.trackLot,
    trackExpiry: row.trackExpiry,
    costPrice: dec(row.costPrice),
    salePrice: dec(row.salePrice),
    ncm: row.ncm,
    cest: row.cest,
    origin: row.origin,
    defaultCfop: row.defaultCfop,
    fiscalUnit: row.fiscalUnit,
    complementaryDescription: row.complementaryDescription,
    notes: row.notes,
    manufacturer: row.manufacturer,
    mainSupplier: row.mainSupplier,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  return StockItem.rehydrate(props);
}

export function toPersistence(
  item: StockItem,
): Prisma.StockItemUncheckedCreateInput {
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
    brandId: p.brandId,
    locationId: p.locationId,
    measureUnitId: p.measureUnitId,
    purchaseUnitId: p.purchaseUnitId,
    saleUnitId: p.saleUnitId,
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
    ncm: p.ncm,
    cest: p.cest,
    origin: p.origin,
    defaultCfop: p.defaultCfop,
    fiscalUnit: p.fiscalUnit,
    complementaryDescription: p.complementaryDescription,
    notes: p.notes,
    manufacturer: p.manufacturer,
    mainSupplier: p.mainSupplier,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export function relationsFromInclude(row: {
  category: { name: string } | null;
  brand: { name: string } | null;
  location: { name: string } | null;
  measureUnit: { code: string; label: string } | null;
  purchaseUnit: { code: string } | null;
  saleUnit: { code: string } | null;
}): StockItemRelations {
  return {
    categoryName: row.category?.name ?? null,
    brandName: row.brand?.name ?? null,
    locationName: row.location?.name ?? null,
    measureUnitCode: row.measureUnit?.code ?? null,
    measureUnitLabel: row.measureUnit?.label ?? null,
    purchaseUnitCode: row.purchaseUnit?.code ?? null,
    saleUnitCode: row.saleUnit?.code ?? null,
  };
}
