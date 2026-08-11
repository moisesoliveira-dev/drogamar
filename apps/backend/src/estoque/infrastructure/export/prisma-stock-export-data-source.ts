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
  type ExpiryStatusKind,
} from '../../domain/expiry-classification';
import type {
  ExportCurrentStockFilters,
  ExportItemsFilters,
  ExportLotsFilters,
  ExportCategoriesFilters,
} from '../../domain/export/export-types';
import {
  resolveIntegrationStatus,
  friendlySyncError,
} from '../../domain/online-store/online-store.types';
import type {
  ExportQuery,
  ExportRow,
  StockExportDataSource,
} from '../../domain/ports/stock-export.ports';

function decimalToNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return Number(value);
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function formatDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

function formatDateTime(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString();
}

@Injectable()
export class PrismaStockExportDataSource implements StockExportDataSource {
  constructor(private readonly prisma: PrismaService) {}

  async count(query: Omit<ExportQuery, 'columns' | 'maxRecords'>): Promise<number> {
    switch (query.type) {
      case 'ITEMS':
        return this.prisma.stockItem.count({
          where: this.itemsWhere(query.filters as ExportItemsFilters),
        });
      case 'CURRENT_STOCK':
        return this.prisma.stockItem.count({
          where: this.currentStockWhere(query.filters as ExportCurrentStockFilters),
        });
      case 'CATEGORIES':
        return this.prisma.stockCategory.count({
          where: this.categoriesWhere(query.filters as ExportCategoriesFilters),
        });
      case 'LOTS_EXPIRY':
        return this.countLots(query.filters as ExportLotsFilters);
      case 'ONLINE_STORE':
        return (
          await this.fetchOnlineStoreRows(
            {
              ...query,
              columns: [],
              maxRecords: 100_000,
            },
            true,
          )
        ).length;
      default:
        return 0;
    }
  }

  async fetchRows(query: ExportQuery): Promise<ExportRow[]> {
    switch (query.type) {
      case 'ITEMS':
        return this.fetchItems(query);
      case 'CURRENT_STOCK':
        return this.fetchCurrentStock(query);
      case 'CATEGORIES':
        return this.fetchCategories(query);
      case 'LOTS_EXPIRY':
        return this.fetchLots(query);
      case 'ONLINE_STORE':
        return this.fetchOnlineStoreRows(query, false);
      default:
        return [];
    }
  }

  private async fetchOnlineStoreRows(
    query: ExportQuery,
    countOnly: boolean,
  ): Promise<ExportRow[]> {
    const channel = await this.prisma.salesChannel.findFirst({
      where: { isDefault: true, connectionStatus: 'CONNECTED' },
      orderBy: { createdAt: 'asc' },
    });
    if (!channel) return [];

    const filters = query.filters as {
      search?: string;
      status?: string;
      publish?: string;
      sync?: string;
    };

    const where: Prisma.StockItemWhereInput = {
      itemType: { in: ['PRODUCT', 'OTHER'] },
    };
    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.stockItem.findMany({
      where,
      include: {
        onlineListings: { where: { channelId: channel.id }, take: 1 },
      },
      orderBy: { description: 'asc' },
      take: countOnly ? undefined : query.maxRecords,
    });

    const today = toUtcDateOnly(new Date());
    const rows: ExportRow[] = [];

    for (const item of items) {
      const listing = item.onlineListings[0] ?? null;
      const physical = decimalToNumber(item.currentStock) ?? 0;
      let available = physical;
      if (item.trackExpiry) {
        const agg = await this.prisma.stockLot.aggregate({
          where: {
            itemId: item.id,
            expiryDate: { gte: today },
            quantity: { gt: 0 },
          },
          _sum: { quantity: true },
        });
        available = Math.max(0, decimalToNumber(agg._sum.quantity) ?? 0);
      }

      const integrationStatus = resolveIntegrationStatus({
        itemStatus: item.status,
        publishStatus: listing?.publishStatus ?? null,
        syncStatus: listing?.syncStatus ?? null,
      });
      const publishStatus = listing?.publishStatus ?? 'NOT_PUBLISHED';
      const syncStatus = listing?.syncStatus ?? null;

      if (filters.status && filters.status !== 'ALL' && integrationStatus !== filters.status) {
        continue;
      }
      if (filters.publish && filters.publish !== 'ALL' && publishStatus !== filters.publish) {
        continue;
      }
      if (filters.sync && filters.sync !== 'ALL' && (syncStatus ?? 'PENDING') !== filters.sync) {
        continue;
      }

      const storePrice =
        listing && !listing.useErpPrice
          ? decimalToNumber(listing.priceOverride)
          : decimalToNumber(item.salePrice);

      rows.push(
        this.pick(query.columns, {
          code: item.code,
          description: item.description,
          sku: item.sku,
          integrationStatus,
          publishStatus,
          syncStatus,
          storePrice,
          availableStock: available,
          publishedStock: decimalToNumber(listing?.publishedStockQty),
          channelName: channel.name,
          lastSyncedAt: formatDateTime(listing?.lastSyncedAt),
          errorMessage:
            listing?.lastErrorMessage ??
            (listing?.lastErrorCode
              ? friendlySyncError(listing.lastErrorCode)
              : null),
        }),
      );
    }

    return rows;
  }

  private itemsWhere(filters: ExportItemsFilters): Prisma.StockItemWhereInput {
    const where: Prisma.StockItemWhereInput = {};
    if (filters.status) where.status = filters.status as 'ACTIVE' | 'INACTIVE';
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.measureUnitId) where.measureUnitId = filters.measureUnitId;
    if (filters.code?.trim()) {
      where.code = { contains: filters.code.trim(), mode: 'insensitive' };
    }
    if (filters.description?.trim()) {
      where.description = {
        contains: filters.description.trim(),
        mode: 'insensitive',
      };
    }
    if (filters.sku?.trim()) {
      where.sku = { contains: filters.sku.trim(), mode: 'insensitive' };
    }
    if (filters.barcode?.trim()) {
      where.barcode = { contains: filters.barcode.trim(), mode: 'insensitive' };
    }
    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private currentStockWhere(
    filters: ExportCurrentStockFilters,
  ): Prisma.StockItemWhereInput {
    const where: Prisma.StockItemWhereInput = { trackStock: true };
    if (filters.status) where.status = filters.status as 'ACTIVE' | 'INACTIVE';
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.qtyMin != null || filters.qtyMax != null) {
      where.currentStock = {};
      if (filters.qtyMin != null) where.currentStock.gte = filters.qtyMin;
      if (filters.qtyMax != null) where.currentStock.lte = filters.qtyMax;
    }
    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }
    return where;
  }

  private categoriesWhere(
    filters: ExportCategoriesFilters,
  ): Prisma.StockCategoryWhereInput {
    const where: Prisma.StockCategoryWhereInput = {};
    if (filters.active != null) where.active = filters.active;
    const search = filters.search?.trim();
    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    return where;
  }

  private async countLots(filters: ExportLotsFilters): Promise<number> {
    const rows = await this.loadLotCandidates(filters, 100_000);
    return this.filterLotsInMemory(rows, filters).length;
  }

  private async fetchItems(query: ExportQuery): Promise<ExportRow[]> {
    const filters = query.filters as ExportItemsFilters;
    const sortBy = [
      'code',
      'description',
      'currentStock',
      'updatedAt',
      'status',
    ].includes(query.sortBy)
      ? query.sortBy
      : 'description';

    const rows = await this.prisma.stockItem.findMany({
      where: this.itemsWhere(filters),
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        location: { select: { name: true } },
        measureUnit: { select: { code: true } },
      },
      orderBy: { [sortBy]: query.sortDir },
      take: query.maxRecords,
    });

    return rows.map((row) =>
      this.pick(query.columns, {
        code: row.code,
        description: row.description,
        sku: row.sku,
        barcode: row.barcode,
        itemType: row.itemType,
        status: row.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
        categoryName: row.category?.name ?? null,
        brandName: row.brand?.name ?? null,
        locationName: row.location?.name ?? null,
        measureUnitCode: row.measureUnit?.code ?? null,
        currentStock: decimalToNumber(row.currentStock),
        minStock: decimalToNumber(row.minStock),
        maxStock: decimalToNumber(row.maxStock),
        costPrice: decimalToNumber(row.costPrice),
        salePrice: decimalToNumber(row.salePrice),
        mainSupplier: row.mainSupplier,
        ncm: row.ncm,
        cest: row.cest,
        origin: row.origin,
        defaultCfop: row.defaultCfop,
        updatedAt: formatDateTime(row.updatedAt),
      }),
    );
  }

  private async fetchCurrentStock(query: ExportQuery): Promise<ExportRow[]> {
    const filters = query.filters as ExportCurrentStockFilters;
    const sortBy = ['code', 'description', 'currentStock', 'updatedAt'].includes(
      query.sortBy,
    )
      ? query.sortBy
      : 'description';

    const rows = await this.prisma.stockItem.findMany({
      where: this.currentStockWhere(filters),
      include: {
        category: { select: { name: true } },
        location: { select: { name: true } },
        measureUnit: { select: { code: true } },
      },
      orderBy: { [sortBy]: query.sortDir },
      take: query.maxRecords,
    });

    return rows.map((row) =>
      this.pick(query.columns, {
        code: row.code,
        description: row.description,
        categoryName: row.category?.name ?? null,
        locationName: row.location?.name ?? null,
        measureUnitCode: row.measureUnit?.code ?? null,
        currentStock: decimalToNumber(row.currentStock),
        minStock: decimalToNumber(row.minStock),
        maxStock: decimalToNumber(row.maxStock),
        status: row.status === 'ACTIVE' ? 'Ativo' : 'Inativo',
        costPrice: decimalToNumber(row.costPrice),
      }),
    );
  }

  private async fetchCategories(query: ExportQuery): Promise<ExportRow[]> {
    const filters = query.filters as ExportCategoriesFilters;
    const sortBy = ['name', 'updatedAt'].includes(query.sortBy)
      ? query.sortBy
      : 'name';

    const rows = await this.prisma.stockCategory.findMany({
      where: this.categoriesWhere(filters),
      include: { _count: { select: { items: true } } },
      orderBy: { [sortBy]: query.sortDir },
      take: query.maxRecords,
    });

    return rows.map((row) =>
      this.pick(query.columns, {
        name: row.name,
        active: row.active ? 'Sim' : 'Não',
        itemCount: row._count.items,
        createdAt: formatDateTime(row.createdAt),
        updatedAt: formatDateTime(row.updatedAt),
      }),
    );
  }

  private async fetchLots(query: ExportQuery): Promise<ExportRow[]> {
    const filters = query.filters as ExportLotsFilters;
    const candidates = await this.loadLotCandidates(filters, query.maxRecords * 3);
    const filtered = this.filterLotsInMemory(candidates, filters);
    const sorted = this.sortLots(filtered, query.sortBy, query.sortDir).slice(
      0,
      query.maxRecords,
    );

    return sorted.map((row) =>
      this.pick(query.columns, {
        itemCode: row.item.code,
        itemDescription: row.item.description,
        categoryName: row.item.category?.name ?? null,
        lotNumber: row.lotNumber,
        expiryDate: formatDate(row.expiryDate),
        daysRemaining: row.daysRemaining,
        statusLabel: row.statusLabel,
        quantity: row.quantity,
        locationName: row.location?.name ?? null,
        manufacturingDate: formatDate(row.manufacturingDate),
        valueAtRisk: row.valueAtRisk,
      }),
    );
  }

  private async loadLotCandidates(filters: ExportLotsFilters, take: number) {
    const itemWhere: Prisma.StockItemWhereInput = { trackExpiry: true };
    if (filters.categoryId) itemWhere.categoryId = filters.categoryId;

    const where: Prisma.StockLotWhereInput = {
      item: itemWhere,
    };
    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.lotNumber?.trim()) {
      where.lotNumber = {
        contains: filters.lotNumber.trim(),
        mode: 'insensitive',
      };
    }
    if (filters.expiryFrom || filters.expiryTo) {
      where.expiryDate = {};
      if (filters.expiryFrom) where.expiryDate.gte = new Date(filters.expiryFrom);
      if (filters.expiryTo) where.expiryDate.lte = new Date(filters.expiryTo);
    }
    if (filters.onlyWithQuantity) {
      where.quantity = { gt: 0 };
    }
    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { lotNumber: { contains: search, mode: 'insensitive' } },
        {
          item: {
            is: {
              OR: [
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    return this.prisma.stockLot.findMany({
      where,
      include: {
        location: { select: { name: true } },
        item: {
          select: {
            code: true,
            description: true,
            costPrice: true,
            category: { select: { name: true } },
          },
        },
      },
      take,
    });
  }

  private filterLotsInMemory(
    rows: Awaited<ReturnType<PrismaStockExportDataSource['loadLotCandidates']>>,
    filters: ExportLotsFilters,
  ) {
    const today = new Date();
    const alertWindowDays = filters.alertWindowDays ?? 30;
    const statusFilter = filters.status ?? 'ALL';

    return rows
      .map((row) => {
        const quantity = decimalToNumber(row.quantity) ?? 0;
        const cost = decimalToNumber(row.item.costPrice);
        const daysRemaining = daysUntilExpiry(today, row.expiryDate);
        const statusKind = classifyExpiryStatus(daysRemaining, alertWindowDays);
        return {
          ...row,
          quantity,
          daysRemaining,
          statusKind,
          statusLabel: formatExpiryStatusLabel(statusKind, daysRemaining),
          valueAtRisk: estimateLotValueAtRisk(quantity, cost),
        };
      })
      .filter((row) =>
        this.matchesLotStatus(
          row.statusKind,
          row.daysRemaining,
          statusFilter,
          alertWindowDays,
        ),
      );
  }

  private matchesLotStatus(
    kind: ExpiryStatusKind,
    daysRemaining: number,
    status: string,
    alertWindowDays: number,
  ): boolean {
    if (!status || status === 'ALL') return true;
    switch (status) {
      case 'EXPIRED':
        return kind === 'EXPIRED';
      case 'EXPIRES_TODAY':
        return kind === 'EXPIRES_TODAY';
      case 'EXPIRES_IN_7':
        return daysRemaining >= 0 && daysRemaining <= 7;
      case 'EXPIRES_IN_15':
        return daysRemaining >= 0 && daysRemaining <= 15;
      case 'EXPIRES_IN_30':
        return daysRemaining >= 0 && daysRemaining <= 30;
      case 'ATTENTION':
        return isWithinAttention(kind) && daysRemaining <= alertWindowDays;
      case 'REGULAR':
        return kind === 'REGULAR';
      default:
        return true;
    }
  }

  private sortLots<
    T extends {
      daysRemaining: number;
      quantity: number;
      valueAtRisk: number | null;
      expiryDate: Date;
      item: { description: string };
    },
  >(rows: T[], sortBy: string, sortDir: 'asc' | 'desc'): T[] {
    const dir = sortDir === 'desc' ? -1 : 1;
    return [...rows].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'daysRemaining') cmp = a.daysRemaining - b.daysRemaining;
      else if (sortBy === 'quantity') cmp = a.quantity - b.quantity;
      else if (sortBy === 'valueAtRisk') {
        cmp = (a.valueAtRisk ?? 0) - (b.valueAtRisk ?? 0);
      } else if (sortBy === 'item') {
        cmp = a.item.description.localeCompare(b.item.description, 'pt-BR');
      } else {
        cmp = a.expiryDate.getTime() - b.expiryDate.getTime();
      }
      return cmp * dir;
    });
  }

  private pick(
    columns: string[],
    source: Record<string, string | number | boolean | null>,
  ): ExportRow {
    const row: ExportRow = {};
    for (const col of columns) {
      row[col] = source[col] ?? null;
    }
    return row;
  }
}
