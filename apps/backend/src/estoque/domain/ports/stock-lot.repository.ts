import type { ExpiryStatusKind } from '../expiry-classification';

export const STOCK_LOT_REPOSITORY = Symbol('STOCK_LOT_REPOSITORY');

export type ExpiryAlertFilterStatus =
  | 'ALL'
  | 'EXPIRED'
  | 'EXPIRES_TODAY'
  | 'EXPIRES_IN_7'
  | 'EXPIRES_IN_15'
  | 'EXPIRES_IN_30'
  | 'ATTENTION'
  | 'REGULAR';

export type ExpiryAlertListFilter = {
  alertWindowDays: number;
  status?: ExpiryAlertFilterStatus;
  search?: string;
  categoryId?: string;
  brandId?: string;
  lotNumber?: string;
  locationId?: string;
  expiryFrom?: Date;
  expiryTo?: Date;
  onlyWithQuantity?: boolean;
  page: number;
  pageSize: number;
  sortBy: 'expiryDate' | 'daysRemaining' | 'quantity' | 'valueAtRisk' | 'item';
  sortDir: 'asc' | 'desc';
};

export type StockLotRecord = {
  id: string;
  lotNumber: string;
  manufacturingDate: Date | null;
  expiryDate: Date;
  quantity: number;
  enteredAt: Date;
  createdAt: Date;
  updatedAt: Date;
  locationId: string | null;
  locationName: string | null;
  item: {
    id: string;
    code: string;
    description: string;
    sku: string | null;
    barcode: string | null;
    costPrice: number | null;
    categoryId: string | null;
    categoryName: string | null;
    brandId: string | null;
    brandName: string | null;
    measureUnitId: string | null;
    measureUnitCode: string | null;
    trackExpiry: boolean;
    trackLot: boolean;
  };
};

export type ExpiryAlertRow = StockLotRecord & {
  daysRemaining: number;
  statusKind: ExpiryStatusKind;
  statusLabel: string;
  valueAtRisk: number | null;
};

export type ExpiryAlertSummary = {
  expiredCount: number;
  expiresIn7Count: number;
  expiresIn30Count: number;
  attentionCount: number;
  valueAtRisk: number;
  alertWindowDays: number;
};

export type ExpiryAlertListResult = {
  items: ExpiryAlertRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: ExpiryAlertSummary;
};

export interface StockLotRepository {
  listExpiryAlerts(
    filter: ExpiryAlertListFilter,
    today: Date,
  ): Promise<ExpiryAlertListResult>;
  findById(id: string): Promise<StockLotRecord | null>;
}
