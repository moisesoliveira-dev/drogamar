import { Inject, Injectable } from '@nestjs/common';
import { EXPORT_TYPE_CATALOG } from '../../domain/export/export-catalog';
import {
  ExportExpiredError,
  ExportNotFoundError,
  ExportNotReadyError,
} from '../../domain/export/errors';
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
import {
  CancelStockExportCommand,
  CreateStockExportCommand,
  DownloadStockExportQuery,
  GetStockExportQuery,
  ListStockExportsQuery,
  PreviewExportCountQuery,
  RetryStockExportCommand,
} from '../commands/stock-export.commands';
import { StockExportProcessor } from './stock-export.processor';

@Injectable()
export class GetExportMetaHandler {
  constructor(
    @Inject(STOCK_EXPORT_CONFIG)
    private readonly config: StockExportConfig,
  ) {}

  execute(allowSensitive = true) {
    const types = Object.values(EXPORT_TYPE_CATALOG).map((meta) => ({
      ...meta,
      columns: meta.columns.filter((col) => allowSensitive || !col.sensitive),
    }));
    return {
      types,
      limits: {
        maxRecords: this.config.maxRecords,
        syncThreshold: this.config.syncThreshold,
        maxConcurrentPerUser: this.config.maxConcurrentPerUser,
        retentionDays: this.config.retentionDays,
      },
    };
  }
}

@Injectable()
export class PreviewExportCountHandler {
  constructor(
    @Inject(STOCK_EXPORT_DATA_SOURCE)
    private readonly dataSource: StockExportDataSource,
    @Inject(STOCK_EXPORT_CONFIG)
    private readonly config: StockExportConfig,
  ) {}

  async execute(query: PreviewExportCountQuery) {
    const count = await this.dataSource.count({
      type: query.type,
      filters: query.filters,
      sortBy: query.sortBy,
      sortDir: query.sortDir,
    });
    return {
      count,
      maxRecords: this.config.maxRecords,
      willProcessAsync: count > this.config.syncThreshold,
      exceedsLimit: count > this.config.maxRecords,
    };
  }
}

@Injectable()
export class CreateStockExportHandler {
  constructor(private readonly processor: StockExportProcessor) {}

  execute(command: CreateStockExportCommand) {
    return this.processor.createAndMaybeProcess({
      userId: command.userId,
      type: command.type,
      format: command.format,
      filters: command.filters,
      columns: command.columns,
      sortBy: command.sortBy,
      sortDir: command.sortDir,
      fileName: command.fileName,
    });
  }
}

@Injectable()
export class ListStockExportsHandler {
  constructor(
    @Inject(STOCK_EXPORT_JOB_REPOSITORY)
    private readonly jobs: StockExportJobRepository,
  ) {}

  async execute(query: ListStockExportsQuery) {
    const result = await this.jobs.list({
      userId: query.userId,
      page: query.page,
      pageSize: query.pageSize,
    });
    const items = result.items.map((job) => toExportJobView(job));
    return {
      items,
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / query.pageSize)),
    };
  }
}

@Injectable()
export class GetStockExportHandler {
  constructor(private readonly processor: StockExportProcessor) {}

  async execute(query: GetStockExportQuery) {
    const view = await this.processor.ensureNotExpired(query.exportId);
    this.processor.assertOwner(view.userId, query.userId);
    return view;
  }
}

@Injectable()
export class DownloadStockExportHandler {
  constructor(
    @Inject(STOCK_EXPORT_JOB_REPOSITORY)
    private readonly jobs: StockExportJobRepository,
    @Inject(STOCK_EXPORT_FILE_STORAGE)
    private readonly storage: StockExportFileStorage,
    private readonly processor: StockExportProcessor,
  ) {}

  async execute(query: DownloadStockExportQuery) {
    const view = await this.processor.ensureNotExpired(query.exportId);
    this.processor.assertOwner(view.userId, query.userId);

    if (view.status === 'EXPIRED') {
      throw new ExportExpiredError();
    }
    if (!view.canDownload) {
      throw new ExportNotReadyError();
    }

    const job = await this.jobs.findById(query.exportId);
    if (!job?.storedPath || !job.mimeType) {
      throw new ExportNotReadyError();
    }

    await this.jobs.markDownloaded(query.exportId);

    return {
      absolutePath: this.storage.resolveAbsolutePath(job.storedPath),
      fileName: job.fileName,
      mimeType: job.mimeType,
    };
  }
}

@Injectable()
export class CancelStockExportHandler {
  constructor(
    @Inject(STOCK_EXPORT_JOB_REPOSITORY)
    private readonly jobs: StockExportJobRepository,
    private readonly processor: StockExportProcessor,
  ) {}

  async execute(command: CancelStockExportCommand) {
    const job = await this.jobs.findById(command.exportId);
    if (!job) throw new ExportNotFoundError();
    this.processor.assertOwner(job.userId, command.userId);

    if (job.status !== 'PENDING' && job.status !== 'PROCESSING') {
      return toExportJobView(job);
    }

    const cancelled = await this.jobs.markCancelled(command.exportId);
    if (!cancelled) throw new ExportNotFoundError();
    return toExportJobView(cancelled);
  }
}

@Injectable()
export class RetryStockExportHandler {
  constructor(
    @Inject(STOCK_EXPORT_JOB_REPOSITORY)
    private readonly jobs: StockExportJobRepository,
    private readonly processor: StockExportProcessor,
  ) {}

  async execute(command: RetryStockExportCommand) {
    const job = await this.jobs.findById(command.exportId);
    if (!job) throw new ExportNotFoundError();
    this.processor.assertOwner(job.userId, command.userId);

    return this.processor.createAndMaybeProcess({
      userId: command.userId,
      type: job.type,
      format: job.format,
      filters: job.filters,
      columns: job.columns,
      sortBy: job.sortBy,
      sortDir: job.sortDir === 'desc' ? 'desc' : 'asc',
      fileName: job.fileName,
    });
  }
}
