import type {
  CreateExportInput,
  ExportFilters,
  ExportJobView,
  StockExportFormat,
  StockExportStatus,
  StockExportType,
} from '../export/export-types';

export const STOCK_EXPORT_JOB_REPOSITORY = Symbol('STOCK_EXPORT_JOB_REPOSITORY');

export type ExportJobRecord = {
  id: string;
  sequentialId: number;
  userId: string;
  type: StockExportType;
  format: StockExportFormat;
  status: StockExportStatus;
  fileName: string;
  storedPath: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  recordCount: number | null;
  filters: ExportFilters;
  columns: string[];
  sortBy: string;
  sortDir: string;
  errorCode: string | null;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  expiresAt: Date | null;
  downloadedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  userName: string | null;
  userEmail: string | null;
};

export type CreateExportJobData = CreateExportInput & {
  fileName: string;
};

export type ListExportJobsFilter = {
  userId?: string;
  page: number;
  pageSize: number;
};

export interface StockExportJobRepository {
  create(data: CreateExportJobData): Promise<ExportJobRecord>;
  findById(id: string): Promise<ExportJobRecord | null>;
  list(
    filter: ListExportJobsFilter,
  ): Promise<{ items: ExportJobRecord[]; total: number }>;
  countActiveByUser(userId: string): Promise<number>;
  markProcessing(id: string): Promise<ExportJobRecord | null>;
  markCompleted(
    id: string,
    data: {
      storedPath: string;
      mimeType: string;
      fileSizeBytes: number;
      recordCount: number;
      expiresAt: Date;
    },
  ): Promise<ExportJobRecord | null>;
  markFailed(
    id: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<ExportJobRecord | null>;
  markCancelled(id: string): Promise<ExportJobRecord | null>;
  markExpired(id: string): Promise<ExportJobRecord | null>;
  markDownloaded(id: string): Promise<void>;
  isCancelRequested(id: string): Promise<boolean>;
}

export function toExportJobView(job: ExportJobRecord, now = new Date()): ExportJobView {
  const expired =
    job.status === 'EXPIRED' ||
    (job.expiresAt != null && job.expiresAt.getTime() < now.getTime());
  const status: StockExportStatus = expired && job.status === 'COMPLETED'
    ? 'EXPIRED'
    : job.status;

  return {
    id: job.id,
    sequentialId: job.sequentialId,
    type: job.type,
    format: job.format,
    status,
    fileName: job.fileName,
    recordCount: job.recordCount,
    fileSizeBytes: job.fileSizeBytes,
    filters: job.filters,
    columns: job.columns,
    sortBy: job.sortBy,
    sortDir: job.sortDir,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
    userId: job.userId,
    userName: job.userName,
    userEmail: job.userEmail,
    startedAt: job.startedAt?.toISOString() ?? null,
    completedAt: job.completedAt?.toISOString() ?? null,
    expiresAt: job.expiresAt?.toISOString() ?? null,
    downloadedAt: job.downloadedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    canDownload: status === 'COMPLETED' && !expired && Boolean(job.storedPath),
    canCancel: status === 'PENDING' || status === 'PROCESSING',
    canRetry: status === 'FAILED' || status === 'EXPIRED' || status === 'CANCELLED',
  };
}
