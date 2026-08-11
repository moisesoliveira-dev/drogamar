import { Inject, Injectable, Logger } from '@nestjs/common';
import { getExportTypeMeta } from '../../domain/export/export-catalog';
import {
  ExportConcurrencyError,
  ExportLimitError,
  ExportNotFoundError,
  ExportPermissionError,
  ExportValidationError,
} from '../../domain/export/errors';
import {
  defaultExportBaseName,
  extensionForFormat,
  sanitizeExportFileName,
} from '../../domain/export/file-name';
import type {
  CreateExportInput,
  ExportJobView,
  StockExportFormat,
  StockExportType,
} from '../../domain/export/export-types';
import {
  STOCK_EXPORT_JOB_REPOSITORY,
  toExportJobView,
  type StockExportJobRepository,
} from '../../domain/ports/stock-export-job.repository';
import {
  STOCK_EXPORT_CONFIG,
  STOCK_EXPORT_DATA_SOURCE,
  STOCK_EXPORT_FILE_STORAGE,
  type StockExportConfig,
  type StockExportDataSource,
  type StockExportFileStorage,
} from '../../domain/ports/stock-export.ports';

@Injectable()
export class StockExportProcessor {
  private readonly logger = new Logger(StockExportProcessor.name);
  private readonly running = new Set<string>();

  constructor(
    @Inject(STOCK_EXPORT_JOB_REPOSITORY)
    private readonly jobs: StockExportJobRepository,
    @Inject(STOCK_EXPORT_DATA_SOURCE)
    private readonly dataSource: StockExportDataSource,
    @Inject(STOCK_EXPORT_FILE_STORAGE)
    private readonly storage: StockExportFileStorage,
    @Inject(STOCK_EXPORT_CONFIG)
    private readonly config: StockExportConfig,
  ) {}

  async createAndMaybeProcess(
    input: CreateExportInput,
    options?: { allowSensitive?: boolean },
  ): Promise<ExportJobView> {
    const meta = getExportTypeMeta(input.type);
    if (!meta.formats.includes(input.format)) {
      throw new ExportValidationError(
        'Formato incompatível com o tipo de exportação selecionado.',
      );
    }

    const allowSensitive = options?.allowSensitive ?? true;
    const allowedColumns = new Set(
      meta.columns
        .filter((col) => allowSensitive || !col.sensitive)
        .map((col) => col.id),
    );
    const columns = input.columns.filter((id) => allowedColumns.has(id));
    if (columns.length === 0) {
      throw new ExportValidationError(
        'Selecione ao menos uma coluna permitida para exportar.',
      );
    }

    const sortOk = meta.sortOptions.some((opt) => opt.id === input.sortBy);
    if (!sortOk) {
      throw new ExportValidationError('Ordenação inválida para este tipo.');
    }

    const active = await this.jobs.countActiveByUser(input.userId);
    if (active >= this.config.maxConcurrentPerUser) {
      throw new ExportConcurrencyError();
    }

    const count = await this.dataSource.count({
      type: input.type,
      filters: input.filters,
      sortBy: input.sortBy,
      sortDir: input.sortDir,
    });

    if (count > this.config.maxRecords) {
      throw new ExportLimitError();
    }

    const fileName = sanitizeExportFileName(
      input.fileName,
      defaultExportBaseName(meta.label),
      extensionForFormat(input.format),
    );

    const job = await this.jobs.create({
      ...input,
      columns,
      fileName,
    });

    if (count <= this.config.syncThreshold) {
      await this.processJob(job.id);
      const refreshed = await this.jobs.findById(job.id);
      if (!refreshed) throw new ExportNotFoundError();
      return toExportJobView(refreshed);
    }

    setImmediate(() => {
      void this.processJob(job.id);
    });

    return toExportJobView(job);
  }

  async processJob(jobId: string): Promise<void> {
    if (this.running.has(jobId)) return;
    this.running.add(jobId);

    try {
      const current = await this.jobs.findById(jobId);
      if (!current) return;
      if (current.status === 'CANCELLED') return;

      await this.jobs.markProcessing(jobId);
      if (await this.jobs.isCancelRequested(jobId)) return;

      const meta = getExportTypeMeta(current.type);
      const rows = await this.dataSource.fetchRows({
        type: current.type,
        filters: current.filters,
        columns: current.columns,
        sortBy: current.sortBy,
        sortDir: current.sortDir === 'desc' ? 'desc' : 'asc',
        maxRecords: this.config.maxRecords,
      });

      if (await this.jobs.isCancelRequested(jobId)) return;

      const headers = current.columns.map((id) => {
        const col = meta.columns.find((c) => c.id === id);
        return col?.label ?? id;
      });
      const matrix = rows.map((row) =>
        current.columns.map((id) => row[id] ?? null),
      );

      const generated = await this.storage.writeGenerated(
        jobId,
        current.fileName,
        current.format,
        headers,
        matrix,
        meta.label,
      );

      if (await this.jobs.isCancelRequested(jobId)) {
        await this.storage.deleteIfExists(generated.relativePath);
        return;
      }

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + this.config.retentionDays);

      await this.jobs.markCompleted(jobId, {
        storedPath: generated.relativePath,
        mimeType: generated.mimeType,
        fileSizeBytes: generated.sizeBytes,
        recordCount: rows.length,
        expiresAt,
      });
    } catch (error) {
      this.logger.error(
        `Falha ao processar exportação ${jobId}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.jobs.markFailed(
        jobId,
        'EXPORT_FAILED',
        'Não foi possível gerar o arquivo. Tente novamente.',
      );
    } finally {
      this.running.delete(jobId);
    }
  }

  async ensureNotExpired(jobId: string): Promise<ExportJobView> {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new ExportNotFoundError();
    if (
      job.status === 'COMPLETED' &&
      job.expiresAt &&
      job.expiresAt.getTime() < Date.now()
    ) {
      await this.jobs.markExpired(jobId);
      const refreshed = await this.jobs.findById(jobId);
      if (!refreshed) throw new ExportNotFoundError();
      return toExportJobView(refreshed);
    }
    return toExportJobView(job);
  }

  assertOwner(jobUserId: string, requesterId: string): void {
    if (jobUserId !== requesterId) {
      throw new ExportPermissionError();
    }
  }
}

export function isSupportedExportType(value: string): value is StockExportType {
  return (
    value === 'ITEMS' ||
    value === 'LOTS_EXPIRY' ||
    value === 'CURRENT_STOCK' ||
    value === 'CATEGORIES' ||
    value === 'ONLINE_STORE'
  );
}

export function isSupportedExportFormat(
  value: string,
): value is StockExportFormat {
  return value === 'XLSX' || value === 'CSV' || value === 'PDF';
}
