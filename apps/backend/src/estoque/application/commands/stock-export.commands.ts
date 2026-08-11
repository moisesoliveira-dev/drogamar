import type {
  ExportFilters,
  StockExportFormat,
  StockExportType,
} from '../../domain/export/export-types';

export class CreateStockExportCommand {
  constructor(
    public readonly userId: string,
    public readonly type: StockExportType,
    public readonly format: StockExportFormat,
    public readonly filters: ExportFilters,
    public readonly columns: string[],
    public readonly sortBy: string,
    public readonly sortDir: 'asc' | 'desc',
    public readonly fileName?: string,
  ) {}
}

export class PreviewExportCountQuery {
  constructor(
    public readonly type: StockExportType,
    public readonly filters: ExportFilters,
    public readonly sortBy: string,
    public readonly sortDir: 'asc' | 'desc',
  ) {}
}

export class ListStockExportsQuery {
  constructor(
    public readonly userId: string,
    public readonly page: number,
    public readonly pageSize: number,
  ) {}
}

export class GetStockExportQuery {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
  ) {}
}

export class DownloadStockExportQuery {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
  ) {}
}

export class CancelStockExportCommand {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
  ) {}
}

export class RetryStockExportCommand {
  constructor(
    public readonly userId: string,
    public readonly exportId: string,
  ) {}
}
