export const STOCK_LOOKUP_REPOSITORY = Symbol('STOCK_LOOKUP_REPOSITORY');

export type LookupOption = {
  id: string;
  label: string;
  code?: string;
};

export type StockLookups = {
  categories: LookupOption[];
  brands: LookupOption[];
  locations: LookupOption[];
  units: LookupOption[];
  itemTypes: Array<{ id: string; label: string }>;
};

export interface StockLookupRepository {
  getLookups(): Promise<StockLookups>;
}
