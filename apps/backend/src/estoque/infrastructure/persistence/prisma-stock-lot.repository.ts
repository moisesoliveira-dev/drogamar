import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  classifyExpiryStatus,
  daysUntilExpiry,
  estimateLotValueAtRisk,
  formatExpiryStatusLabel,
  isWithinAttention,
  toUtcDateOnly,
} from '../../domain/expiry-classification';
import type {
  ExpiryAlertListFilter,
  ExpiryAlertListResult,
  ExpiryAlertRow,
  StockLotRecord,
  StockLotRepository,
} from '../../domain/ports/stock-lot.repository';

const lotInclude = {
  location: { select: { id: true, name: true } },
  item: {
    select: {
      id: true,
      code: true,
      description: true,
      sku: true,
      barcode: true,
      costPrice: true,
      categoryId: true,
      brandId: true,
      measureUnitId: true,
      trackExpiry: true,
      trackLot: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      measureUnit: { select: { code: true } },
    },
  },
} satisfies Prisma.StockLotInclude;

type LotRow = Prisma.StockLotGetPayload<{ include: typeof lotInclude }>;

function toRecord(row: LotRow): StockLotRecord {
  return {
    id: row.id,
    lotNumber: row.lotNumber,
    manufacturingDate: row.manufacturingDate,
    expiryDate: row.expiryDate,
    quantity: Number(row.quantity.toString()),
    enteredAt: row.enteredAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    locationId: row.locationId,
    locationName: row.location?.name ?? null,
    item: {
      id: row.item.id,
      code: row.item.code,
      description: row.item.description,
      sku: row.item.sku,
      barcode: row.item.barcode,
      costPrice:
        row.item.costPrice != null
          ? Number(row.item.costPrice.toString())
          : null,
      categoryId: row.item.categoryId,
      categoryName: row.item.category?.name ?? null,
      brandId: row.item.brandId,
      brandName: row.item.brand?.name ?? null,
      measureUnitId: row.item.measureUnitId,
      measureUnitCode: row.item.measureUnit?.code ?? null,
      trackExpiry: row.item.trackExpiry,
      trackLot: row.item.trackLot,
    },
  };
}

function toAlertRow(
  record: StockLotRecord,
  today: Date,
  window: number,
): ExpiryAlertRow {
  const daysRemaining = daysUntilExpiry(today, record.expiryDate);
  const statusKind = classifyExpiryStatus(daysRemaining, window);
  return {
    ...record,
    daysRemaining,
    statusKind,
    statusLabel: formatExpiryStatusLabel(statusKind, daysRemaining),
    valueAtRisk: estimateLotValueAtRisk(record.quantity, record.item.costPrice),
  };
}

function matchesStatusFilter(
  row: ExpiryAlertRow,
  status: ExpiryAlertListFilter['status'],
  window: number,
): boolean {
  if (!status || status === 'ALL') return true;
  switch (status) {
    case 'EXPIRED':
      return row.statusKind === 'EXPIRED';
    case 'EXPIRES_TODAY':
      return row.statusKind === 'EXPIRES_TODAY';
    case 'EXPIRES_IN_7':
      return row.daysRemaining >= 0 && row.daysRemaining <= 7;
    case 'EXPIRES_IN_15':
      return row.daysRemaining >= 0 && row.daysRemaining <= 15;
    case 'EXPIRES_IN_30':
      return row.daysRemaining >= 0 && row.daysRemaining <= 30;
    case 'ATTENTION':
      return isWithinAttention(row.statusKind) && row.daysRemaining <= window;
    case 'REGULAR':
      return row.statusKind === 'REGULAR';
    default:
      return true;
  }
}

@Injectable()
export class PrismaStockLotRepository implements StockLotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<StockLotRecord | null> {
    const row = await this.prisma.stockLot.findUnique({
      where: { id },
      include: lotInclude,
    });
    return row ? toRecord(row) : null;
  }

  async listExpiryAlerts(
    filter: ExpiryAlertListFilter,
    todayInput: Date,
  ): Promise<ExpiryAlertListResult> {
    const today = toUtcDateOnly(todayInput);
    const window = Math.max(1, filter.alertWindowDays);

    const where: Prisma.StockLotWhereInput = {
      item: {
        trackExpiry: true,
        status: 'ACTIVE',
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
        ...(filter.brandId ? { brandId: filter.brandId } : {}),
        ...(filter.search
          ? {
              OR: [
                {
                  code: {
                    contains: filter.search,
                    mode: 'insensitive',
                  },
                },
                {
                  description: {
                    contains: filter.search,
                    mode: 'insensitive',
                  },
                },
                {
                  sku: {
                    contains: filter.search,
                    mode: 'insensitive',
                  },
                },
                {
                  barcode: {
                    contains: filter.search,
                    mode: 'insensitive',
                  },
                },
              ],
            }
          : {}),
      },
      ...(filter.lotNumber
        ? {
            lotNumber: {
              contains: filter.lotNumber,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(filter.locationId ? { locationId: filter.locationId } : {}),
      ...(filter.expiryFrom || filter.expiryTo
        ? {
            expiryDate: {
              ...(filter.expiryFrom ? { gte: filter.expiryFrom } : {}),
              ...(filter.expiryTo ? { lte: filter.expiryTo } : {}),
            },
          }
        : {}),
      ...(filter.onlyWithQuantity ? { quantity: { gt: 0 } } : {}),
    };

    const rows = await this.prisma.stockLot.findMany({
      where,
      include: lotInclude,
    });

    const alerts = rows.map((row) => toAlertRow(toRecord(row), today, window));
    const alertsFiltered = alerts.filter((row) =>
      matchesStatusFilter(row, filter.status, window),
    );

    const allForSummary = rows.map((row) =>
      toAlertRow(toRecord(row), today, window),
    );
    const summaryAll = {
      expiredCount: allForSummary.filter((a) => a.statusKind === 'EXPIRED')
        .length,
      expiresIn7Count: allForSummary.filter(
        (a) => a.daysRemaining >= 0 && a.daysRemaining <= 7,
      ).length,
      expiresIn30Count: allForSummary.filter(
        (a) => a.daysRemaining >= 0 && a.daysRemaining <= 30,
      ).length,
      attentionCount: allForSummary.filter(
        (a) => isWithinAttention(a.statusKind) && a.daysRemaining <= window,
      ).length,
      valueAtRisk: Number(
        allForSummary
          .filter((a) => isWithinAttention(a.statusKind))
          .reduce((sum, a) => sum + (a.valueAtRisk ?? 0), 0)
          .toFixed(4),
      ),
      alertWindowDays: window,
    };

    const dir = filter.sortDir === 'desc' ? -1 : 1;
    alertsFiltered.sort((a, b) => {
      let cmp = 0;
      switch (filter.sortBy) {
        case 'daysRemaining':
          cmp = a.daysRemaining - b.daysRemaining;
          break;
        case 'quantity':
          cmp = a.quantity - b.quantity;
          break;
        case 'valueAtRisk':
          cmp = (a.valueAtRisk ?? 0) - (b.valueAtRisk ?? 0);
          break;
        case 'item':
          cmp = a.item.description.localeCompare(b.item.description, 'pt-BR');
          break;
        case 'expiryDate':
        default:
          cmp = a.expiryDate.getTime() - b.expiryDate.getTime();
          break;
      }
      return cmp * dir;
    });

    const total = alertsFiltered.length;
    const page = Math.max(1, filter.page);
    const pageSize = Math.min(100, Math.max(1, filter.pageSize));
    const start = (page - 1) * pageSize;
    const items = alertsFiltered.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      summary: summaryAll,
    };
  }
}
