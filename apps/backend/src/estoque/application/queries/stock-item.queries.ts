import type {
  StockItemStatus,
  StockItemType,
} from '../../domain/stock-item';
import type { StockItemListFilter } from '../../domain/ports/stock-item.repository';

export class ListStockItemsQuery {
  constructor(
    readonly filter: Omit<
      StockItemListFilter,
      'page' | 'pageSize' | 'sortBy' | 'sortDir'
    > & {
      page?: number;
      pageSize?: number;
      sortBy?: StockItemListFilter['sortBy'];
      sortDir?: StockItemListFilter['sortDir'];
      status?: StockItemStatus;
      itemType?: StockItemType;
    },
  ) {}
}

export class GetStockItemQuery {
  constructor(readonly id: string) {}
}

export class GetStockLookupsQuery {}
