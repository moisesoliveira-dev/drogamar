import type { StockItem, StockItemStatus, StockItemType } from '../stock-item';

export const STOCK_ITEM_REPOSITORY = Symbol('STOCK_ITEM_REPOSITORY');

export type StockItemListFilter = {
  search?: string;
  status?: StockItemStatus;
  categoryId?: string;
  brandId?: string;
  locationId?: string;
  measureUnitId?: string;
  itemType?: StockItemType;
  page: number;
  pageSize: number;
  sortBy:
    | 'code'
    | 'description'
    | 'sku'
    | 'currentStock'
    | 'minStock'
    | 'status'
    | 'createdAt'
    | 'updatedAt';
  sortDir: 'asc' | 'desc';
};

export type StockItemListResult = {
  items: StockItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type StockItemRelations = {
  categoryName: string | null;
  brandName: string | null;
  locationName: string | null;
  measureUnitCode: string | null;
  measureUnitLabel: string | null;
  purchaseUnitCode: string | null;
  saleUnitCode: string | null;
};

export interface StockItemRepository {
  list(filter: StockItemListFilter): Promise<StockItemListResult>;
  findById(id: string): Promise<StockItem | null>;
  findByIdWithRelations(
    id: string,
  ): Promise<{ item: StockItem; relations: StockItemRelations } | null>;
  listWithRelations(
    filter: StockItemListFilter,
  ): Promise<{
    items: Array<{ item: StockItem; relations: StockItemRelations }>;
    total: number;
    page: number;
    pageSize: number;
  }>;
  existsByCode(code: string, excludeId?: string): Promise<boolean>;
  existsBySku(sku: string, excludeId?: string): Promise<boolean>;
  existsByBarcode(barcode: string, excludeId?: string): Promise<boolean>;
  nextCode(): Promise<string>;
  save(item: StockItem): Promise<void>;
  delete(id: string): Promise<void>;
}
