import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StockExportConfig } from '../../domain/ports/stock-export.ports';

@Injectable()
export class EnvStockExportConfig implements StockExportConfig {
  readonly storagePath: string;
  readonly retentionDays: number;
  readonly maxRecords: number;
  readonly syncThreshold: number;
  readonly maxConcurrentPerUser: number;

  constructor(config: ConfigService) {
    this.storagePath =
      config.get<string>('EXPORT_STORAGE_PATH') ??
      'storage/exports';
    this.retentionDays = Number(config.get('EXPORT_RETENTION_DAYS') ?? 7);
    this.maxRecords = Number(config.get('EXPORT_MAX_RECORDS') ?? 50000);
    this.syncThreshold = Number(config.get('EXPORT_SYNC_THRESHOLD') ?? 1000);
    this.maxConcurrentPerUser = Number(
      config.get('EXPORT_MAX_CONCURRENT_PER_USER') ?? 2,
    );
  }
}
