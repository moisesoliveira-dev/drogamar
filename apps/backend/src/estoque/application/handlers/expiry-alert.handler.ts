import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  classifyExpiryStatus,
  daysUntilExpiry,
  estimateLotValueAtRisk,
  formatExpiryStatusLabel,
  toUtcDateOnly,
} from '../../domain/expiry-classification';
import {
  STOCK_LOT_REPOSITORY,
  type StockLotRepository,
} from '../../domain/ports/stock-lot.repository';
import {
  GetStockLotQuery,
  ListExpiryAlertsQuery,
} from '../queries/expiry-alert.queries';

function serializeLotAlert(row: {
  id: string;
  lotNumber: string;
  manufacturingDate: Date | null;
  expiryDate: Date;
  quantity: number;
  enteredAt: Date;
  locationId: string | null;
  locationName: string | null;
  daysRemaining: number;
  statusKind: string;
  statusLabel: string;
  valueAtRisk: number | null;
  item: {
    id: string;
    code: string;
    description: string;
    sku: string | null;
    barcode: string | null;
    costPrice: number | null;
    categoryName: string | null;
    brandName: string | null;
    measureUnitCode: string | null;
  };
}) {
  return {
    id: row.id,
    lotNumber: row.lotNumber,
    manufacturingDate: row.manufacturingDate
      ? row.manufacturingDate.toISOString().slice(0, 10)
      : null,
    expiryDate: row.expiryDate.toISOString().slice(0, 10),
    quantity: row.quantity,
    enteredAt: row.enteredAt.toISOString(),
    locationId: row.locationId,
    locationName: row.locationName,
    daysRemaining: row.daysRemaining,
    statusKind: row.statusKind,
    statusLabel: row.statusLabel,
    valueAtRisk: row.valueAtRisk,
    item: {
      id: row.item.id,
      code: row.item.code,
      description: row.item.description,
      sku: row.item.sku,
      barcode: row.item.barcode,
      costPrice: row.item.costPrice,
      categoryName: row.item.categoryName,
      brandName: row.item.brandName,
      measureUnitCode: row.item.measureUnitCode,
    },
  };
}

@Injectable()
export class ListExpiryAlertsHandler {
  constructor(
    @Inject(STOCK_LOT_REPOSITORY)
    private readonly lots: StockLotRepository,
  ) {}

  async execute(query: ListExpiryAlertsQuery) {
    const result = await this.lots.listExpiryAlerts(
      {
        alertWindowDays: query.filter.alertWindowDays ?? 30,
        status: query.filter.status ?? 'ALL',
        search: query.filter.search,
        categoryId: query.filter.categoryId,
        brandId: query.filter.brandId,
        lotNumber: query.filter.lotNumber,
        locationId: query.filter.locationId,
        expiryFrom: query.filter.expiryFrom,
        expiryTo: query.filter.expiryTo,
        onlyWithQuantity: query.filter.onlyWithQuantity ?? false,
        page: query.filter.page ?? 1,
        pageSize: query.filter.pageSize ?? 20,
        sortBy: query.filter.sortBy ?? 'expiryDate',
        sortDir: query.filter.sortDir ?? 'asc',
      },
      toUtcDateOnly(new Date()),
    );

    return {
      items: result.items.map(serializeLotAlert),
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      summary: result.summary,
    };
  }
}

@Injectable()
export class GetStockLotHandler {
  constructor(
    @Inject(STOCK_LOT_REPOSITORY)
    private readonly lots: StockLotRepository,
  ) {}

  async execute(query: GetStockLotQuery) {
    const lot = await this.lots.findById(query.id);
    if (!lot) {
      throw new NotFoundException({
        code: 'LOT_NOT_FOUND',
        message: 'Lote não encontrado.',
      });
    }

    const today = toUtcDateOnly(new Date());
    const daysRemaining = daysUntilExpiry(today, lot.expiryDate);
    const statusKind = classifyExpiryStatus(
      daysRemaining,
      query.alertWindowDays,
    );

    return {
      ...serializeLotAlert({
        ...lot,
        daysRemaining,
        statusKind,
        statusLabel: formatExpiryStatusLabel(statusKind, daysRemaining),
        valueAtRisk: estimateLotValueAtRisk(lot.quantity, lot.item.costPrice),
      }),
      item: {
        id: lot.item.id,
        code: lot.item.code,
        description: lot.item.description,
        sku: lot.item.sku,
        barcode: lot.item.barcode,
        costPrice: lot.item.costPrice,
        categoryId: lot.item.categoryId,
        categoryName: lot.item.categoryName,
        brandId: lot.item.brandId,
        brandName: lot.item.brandName,
        measureUnitCode: lot.item.measureUnitCode,
        trackExpiry: lot.item.trackExpiry,
        trackLot: lot.item.trackLot,
      },
      historyNote:
        'Histórico de movimentações estará disponível quando o módulo de movimentação for implementado.',
    };
  }
}
