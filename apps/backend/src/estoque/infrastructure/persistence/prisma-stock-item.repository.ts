import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type { StockItem } from '../../domain/stock-item';
import type {
  StockItemListFilter,
  StockItemRepository,
} from '../../domain/ports/stock-item.repository';
import {
  relationsFromInclude,
  toDomain,
  toPersistence,
} from './mappers/stock-item.mapper';

const includeRelations = {
  category: { select: { name: true } },
  brand: { select: { name: true } },
  location: { select: { name: true } },
  measureUnit: { select: { code: true, label: true } },
  purchaseUnit: { select: { code: true } },
  saleUnit: { select: { code: true } },
} satisfies Prisma.StockItemInclude;

@Injectable()
export class PrismaStockItemRepository implements StockItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(
    filter: StockItemListFilter,
  ): Prisma.StockItemWhereInput {
    const where: Prisma.StockItemWhereInput = {};

    if (filter.status) where.status = filter.status;
    if (filter.categoryId) where.categoryId = filter.categoryId;
    if (filter.brandId) where.brandId = filter.brandId;
    if (filter.locationId) where.locationId = filter.locationId;
    if (filter.measureUnitId) where.measureUnitId = filter.measureUnitId;
    if (filter.itemType) where.itemType = filter.itemType;

    const search = filter.search?.trim();
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

  async list(filter: StockItemListFilter) {
    const where = this.buildWhere(filter);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockItem.count({ where }),
      this.prisma.stockItem.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortDir },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
    ]);

    return {
      items: rows.map(toDomain),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async listWithRelations(filter: StockItemListFilter) {
    const where = this.buildWhere(filter);
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockItem.count({ where }),
      this.prisma.stockItem.findMany({
        where,
        include: includeRelations,
        orderBy: { [filter.sortBy]: filter.sortDir },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        item: toDomain(row),
        relations: relationsFromInclude(row),
      })),
      total,
      page: filter.page,
      pageSize: filter.pageSize,
    };
  }

  async findById(id: string): Promise<StockItem | null> {
    const row = await this.prisma.stockItem.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByIdWithRelations(id: string) {
    const row = await this.prisma.stockItem.findUnique({
      where: { id },
      include: includeRelations,
    });
    if (!row) return null;
    return {
      item: toDomain(row),
      relations: relationsFromInclude(row),
    };
  }

  async existsByCode(code: string, excludeId?: string): Promise<boolean> {
    const row = await this.prisma.stockItem.findFirst({
      where: {
        code: { equals: code, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async existsBySku(sku: string, excludeId?: string): Promise<boolean> {
    const row = await this.prisma.stockItem.findFirst({
      where: {
        sku: { equals: sku, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async existsByBarcode(barcode: string, excludeId?: string): Promise<boolean> {
    const row = await this.prisma.stockItem.findFirst({
      where: {
        barcode: { equals: barcode, mode: 'insensitive' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });
    return Boolean(row);
  }

  async nextCode(): Promise<string> {
    const latest = await this.prisma.stockItem.findFirst({
      where: { code: { startsWith: 'ITM-' } },
      orderBy: { code: 'desc' },
      select: { code: true },
    });
    let next = 1;
    if (latest?.code) {
      const match = /^ITM-(\d+)$/.exec(latest.code);
      if (match) next = Number(match[1]) + 1;
    }
    return `ITM-${String(next).padStart(6, '0')}`;
  }

  async save(item: StockItem): Promise<void> {
    const data = toPersistence(item);
    await this.prisma.stockItem.upsert({
      where: { id: item.id },
      create: data,
      update: {
        ...data,
        id: undefined,
        createdAt: undefined,
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.stockItem.delete({ where: { id } });
  }
}
