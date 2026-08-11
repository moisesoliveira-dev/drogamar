import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreateStockItemHandler } from './application/handlers/create-stock-item.handler';
import { DuplicateStockItemHandler } from './application/handlers/duplicate-stock-item.handler';
import {
  ActivateStockItemHandler,
  DeactivateStockItemHandler,
  DeleteStockItemHandler,
} from './application/handlers/lifecycle-stock-item.handler';
import {
  GetStockItemHandler,
  GetStockLookupsHandler,
  ListStockItemsHandler,
} from './application/handlers/query-stock-item.handler';
import {
  GetStockLotHandler,
  ListExpiryAlertsHandler,
} from './application/handlers/expiry-alert.handler';
import { UpdateStockItemHandler } from './application/handlers/update-stock-item.handler';
import {
  CancelStockExportHandler,
  CreateStockExportHandler,
  DownloadStockExportHandler,
  GetExportMetaHandler,
  GetStockExportHandler,
  ListStockExportsHandler,
  PreviewExportCountHandler,
  RetryStockExportHandler,
} from './application/handlers/stock-export.handlers';
import { StockExportProcessor } from './application/handlers/stock-export.processor';
import { STOCK_EVENT_BUS } from './domain/ports/event-bus';
import { STOCK_ITEM_REPOSITORY } from './domain/ports/stock-item.repository';
import { STOCK_LOOKUP_REPOSITORY } from './domain/ports/stock-lookup.repository';
import { STOCK_LOT_REPOSITORY } from './domain/ports/stock-lot.repository';
import { STOCK_EXPORT_JOB_REPOSITORY } from './domain/ports/stock-export-job.repository';
import {
  STOCK_EXPORT_CONFIG,
  STOCK_EXPORT_DATA_SOURCE,
  STOCK_EXPORT_FILE_STORAGE,
} from './domain/ports/stock-export.ports';
import { InMemoryStockEventBus } from './infrastructure/events/in-memory-event-bus';
import { EnvStockExportConfig } from './infrastructure/export/env-stock-export.config';
import { LocalStockExportFileStorage } from './infrastructure/export/local-stock-export-file-storage';
import { PrismaStockExportDataSource } from './infrastructure/export/prisma-stock-export-data-source';
import { PrismaStockExportJobRepository } from './infrastructure/persistence/prisma-stock-export-job.repository';
import { PrismaStockItemRepository } from './infrastructure/persistence/prisma-stock-item.repository';
import { PrismaStockLookupRepository } from './infrastructure/persistence/prisma-stock-lookup.repository';
import { PrismaStockLotRepository } from './infrastructure/persistence/prisma-stock-lot.repository';
import { EstoqueController } from './presentation/estoque.controller';
import { ExportacaoController } from './presentation/exportacao.controller';
import { LojaOnlineController } from './presentation/loja-online.controller';
import { OnlineStoreService } from './application/services/online-store.service';

@Module({
  imports: [AuthModule],
  controllers: [EstoqueController, ExportacaoController, LojaOnlineController],
  providers: [
    ListStockItemsHandler,
    GetStockItemHandler,
    GetStockLookupsHandler,
    CreateStockItemHandler,
    UpdateStockItemHandler,
    DuplicateStockItemHandler,
    DeactivateStockItemHandler,
    ActivateStockItemHandler,
    DeleteStockItemHandler,
    ListExpiryAlertsHandler,
    GetStockLotHandler,
    GetExportMetaHandler,
    PreviewExportCountHandler,
    CreateStockExportHandler,
    ListStockExportsHandler,
    GetStockExportHandler,
    DownloadStockExportHandler,
    CancelStockExportHandler,
    RetryStockExportHandler,
    StockExportProcessor,
    OnlineStoreService,
    { provide: STOCK_ITEM_REPOSITORY, useClass: PrismaStockItemRepository },
    {
      provide: STOCK_LOOKUP_REPOSITORY,
      useClass: PrismaStockLookupRepository,
    },
    { provide: STOCK_LOT_REPOSITORY, useClass: PrismaStockLotRepository },
    { provide: STOCK_EVENT_BUS, useClass: InMemoryStockEventBus },
    {
      provide: STOCK_EXPORT_JOB_REPOSITORY,
      useClass: PrismaStockExportJobRepository,
    },
    {
      provide: STOCK_EXPORT_DATA_SOURCE,
      useClass: PrismaStockExportDataSource,
    },
    {
      provide: STOCK_EXPORT_FILE_STORAGE,
      useClass: LocalStockExportFileStorage,
    },
    { provide: STOCK_EXPORT_CONFIG, useClass: EnvStockExportConfig },
  ],
})
export class EstoqueModule {}
