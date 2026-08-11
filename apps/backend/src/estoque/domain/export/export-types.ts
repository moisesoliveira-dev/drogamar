export type StockExportType =
  'ITEMS' | 'LOTS_EXPIRY' | 'CURRENT_STOCK' | 'CATEGORIES' | 'ONLINE_STORE';

export type StockExportFormat = 'XLSX' | 'CSV' | 'PDF';

export type StockExportStatus =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED' | 'CANCELLED';

export type ExportColumnDef = {
  id: string;
  label: string;
  group: string;
  defaultSelected: boolean;
  sensitive?: boolean;
};

export type ExportTypeMeta = {
  type: StockExportType;
  label: string;
  description: string;
  formats: StockExportFormat[];
  columns: ExportColumnDef[];
  sortOptions: Array<{ id: string; label: string }>;
  defaultSortBy: string;
  defaultSortDir: 'asc' | 'desc';
  filterKeys: string[];
};

export type ExportItemsFilters = {
  code?: string;
  description?: string;
  sku?: string;
  barcode?: string;
  categoryId?: string;
  brandId?: string;
  status?: string;
  measureUnitId?: string;
  locationId?: string;
  search?: string;
};

export type ExportLotsFilters = {
  search?: string;
  categoryId?: string;
  lotNumber?: string;
  status?: string;
  expiryFrom?: string;
  expiryTo?: string;
  locationId?: string;
  onlyWithQuantity?: boolean;
  alertWindowDays?: number;
};

export type ExportCurrentStockFilters = {
  search?: string;
  categoryId?: string;
  locationId?: string;
  status?: string;
  qtyMin?: number;
  qtyMax?: number;
};

export type ExportCategoriesFilters = {
  search?: string;
  active?: boolean;
};

export type ExportFilters =
  | ExportItemsFilters
  | ExportLotsFilters
  | ExportCurrentStockFilters
  | ExportCategoriesFilters;

export type CreateExportInput = {
  userId: string;
  type: StockExportType;
  format: StockExportFormat;
  filters: ExportFilters;
  columns: string[];
  sortBy: string;
  sortDir: 'asc' | 'desc';
  fileName?: string;
};

export type ExportJobView = {
  id: string;
  sequentialId: number;
  type: StockExportType;
  format: StockExportFormat;
  status: StockExportStatus;
  fileName: string;
  recordCount: number | null;
  fileSizeBytes: number | null;
  filters: ExportFilters;
  columns: string[];
  sortBy: string;
  sortDir: string;
  errorCode: string | null;
  errorMessage: string | null;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  startedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  downloadedAt: string | null;
  createdAt: string;
  canDownload: boolean;
  canCancel: boolean;
  canRetry: boolean;
};
