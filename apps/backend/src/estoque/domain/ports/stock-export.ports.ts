import type {
  ExportFilters,
  StockExportFormat,
  StockExportType,
} from '../export/export-types';

export const STOCK_EXPORT_DATA_SOURCE = Symbol('STOCK_EXPORT_DATA_SOURCE');

export type ExportRow = Record<string, string | number | boolean | null>;

export type ExportQuery = {
  type: StockExportType;
  filters: ExportFilters;
  columns: string[];
  sortBy: string;
  sortDir: 'asc' | 'desc';
  maxRecords: number;
};

export interface StockExportDataSource {
  count(query: Omit<ExportQuery, 'columns' | 'maxRecords'>): Promise<number>;
  fetchRows(query: ExportQuery): Promise<ExportRow[]>;
}

export type GeneratedFile = {
  absolutePath: string;
  relativePath: string;
  mimeType: string;
  sizeBytes: number;
};

export const STOCK_EXPORT_FILE_STORAGE = Symbol('STOCK_EXPORT_FILE_STORAGE');

export interface StockExportFileStorage {
  ensureReady(): Promise<void>;
  writeGenerated(
    jobId: string,
    fileName: string,
    format: StockExportFormat,
    headers: string[],
    rows: Array<Array<string | number | boolean | null>>,
    title: string,
  ): Promise<GeneratedFile>;
  resolveAbsolutePath(relativePath: string): string;
  deleteIfExists(relativePath: string | null): Promise<void>;
}

export const STOCK_EXPORT_CONFIG = Symbol('STOCK_EXPORT_CONFIG');

export type StockExportConfig = {
  storagePath: string;
  retentionDays: number;
  maxRecords: number;
  syncThreshold: number;
  maxConcurrentPerUser: number;
};
