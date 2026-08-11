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
import { STOCK_EVENT_BUS } from './domain/ports/event-bus';
import { STOCK_ITEM_REPOSITORY } from './domain/ports/stock-item.repository';
import { STOCK_LOOKUP_REPOSITORY } from './domain/ports/stock-lookup.repository';
import { STOCK_LOT_REPOSITORY } from './domain/ports/stock-lot.repository';
import { InMemoryStockEventBus } from './infrastructure/events/in-memory-event-bus';
import { PrismaStockItemRepository } from './infrastructure/persistence/prisma-stock-item.repository';
import { PrismaStockLookupRepository } from './infrastructure/persistence/prisma-stock-lookup.repository';
import { PrismaStockLotRepository } from './infrastructure/persistence/prisma-stock-lot.repository';
import { EstoqueController } from './presentation/estoque.controller';

@Module({
  imports: [AuthModule],
  controllers: [EstoqueController],
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
    { provide: STOCK_ITEM_REPOSITORY, useClass: PrismaStockItemRepository },
    {
      provide: STOCK_LOOKUP_REPOSITORY,
      useClass: PrismaStockLookupRepository,
    },
    { provide: STOCK_LOT_REPOSITORY, useClass: PrismaStockLotRepository },
    { provide: STOCK_EVENT_BUS, useClass: InMemoryStockEventBus },
  ],
})
export class EstoqueModule {}
