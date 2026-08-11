import { Inject, Injectable } from '@nestjs/common';
import { StockItemNotFoundError } from '../../domain/errors';
import {
  STOCK_ITEM_REPOSITORY,
  type StockItemRepository,
} from '../../domain/ports/stock-item.repository';
import {
  STOCK_LOOKUP_REPOSITORY,
  type StockLookupRepository,
} from '../../domain/ports/stock-lookup.repository';
import { toStockItemDto } from '../dto/stock-item.dto';
import {
  GetStockItemQuery,
  GetStockLookupsQuery,
  ListStockItemsQuery,
} from '../queries/stock-item.queries';

@Injectable()
export class ListStockItemsHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
  ) {}

  async execute(query: ListStockItemsQuery) {
    const page = Math.max(1, query.filter.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.filter.pageSize ?? 20));
    const result = await this.items.listWithRelations({
      search: query.filter.search,
      status: query.filter.status,
      categoryId: query.filter.categoryId,
      brandId: query.filter.brandId,
      locationId: query.filter.locationId,
      measureUnitId: query.filter.measureUnitId,
      itemType: query.filter.itemType,
      page,
      pageSize,
      sortBy: query.filter.sortBy ?? 'description',
      sortDir: query.filter.sortDir ?? 'asc',
    });

    return {
      items: result.items.map(({ item, relations }) =>
        toStockItemDto(item, relations),
      ),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: Math.max(1, Math.ceil(result.total / result.pageSize)),
    };
  }
}

@Injectable()
export class GetStockItemHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
  ) {}

  async execute(query: GetStockItemQuery) {
    const loaded = await this.items.findByIdWithRelations(query.id);
    if (!loaded) throw new StockItemNotFoundError();
    return toStockItemDto(loaded.item, loaded.relations);
  }
}

@Injectable()
export class GetStockLookupsHandler {
  constructor(
    @Inject(STOCK_LOOKUP_REPOSITORY)
    private readonly lookups: StockLookupRepository,
  ) {}

  async execute(_query: GetStockLookupsQuery) {
    return this.lookups.getLookups();
  }
}
