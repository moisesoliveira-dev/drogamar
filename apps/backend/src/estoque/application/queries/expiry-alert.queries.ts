import type { ExpiryAlertListFilter } from '../../domain/ports/stock-lot.repository';

export class ListExpiryAlertsQuery {
  constructor(readonly filter: Partial<ExpiryAlertListFilter> & {
    alertWindowDays?: number;
  }) {}
}

export class GetStockLotQuery {
  constructor(
    readonly id: string,
    readonly alertWindowDays: number = 30,
  ) {}
}
