import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { toUtcDateOnly } from '../../domain/expiry-classification';
import { evaluatePublishReadiness } from '../../domain/online-store/publish-readiness';
import {
  friendlySyncError,
  resolveIntegrationStatus,
  type OnlineIntegrationStatus,
  type OnlineListingPublishStatus,
  type OnlineListingSyncStatus,
  type OnlineStorePending,
} from '../../domain/online-store/online-store.types';

function dec(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export type OnlineProductFilters = {
  search?: string;
  status?: OnlineIntegrationStatus | 'ALL';
  categoryId?: string;
  brandId?: string;
  stock?: 'ALL' | 'WITH_STOCK' | 'WITHOUT_STOCK' | 'LOW_STOCK';
  sync?: 'ALL' | OnlineListingSyncStatus;
  publish?: 'ALL' | OnlineListingPublishStatus;
  page: number;
  pageSize: number;
};

@Injectable()
export class OnlineStoreService {
  constructor(private readonly prisma: PrismaService) {}

  async getDefaultChannel() {
    return this.prisma.salesChannel.findFirst({
      where: { isDefault: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOverview() {
    const channel = await this.getDefaultChannel();
    if (!channel || channel.connectionStatus === 'DISCONNECTED') {
      return {
        connected: false,
        channel: channel ? this.toChannelDto(channel) : null,
        metrics: null,
      };
    }

    const items = await this.prisma.stockItem.findMany({
      where: { itemType: { in: ['PRODUCT', 'OTHER'] } },
      select: {
        id: true,
        status: true,
        currentStock: true,
        minStock: true,
        trackStock: true,
        trackExpiry: true,
        salePrice: true,
      },
    });
    const listings = await this.prisma.onlineStoreListing.findMany({
      where: { channelId: channel.id },
    });
    const listingByItem = new Map(listings.map((l) => [l.itemId, l]));

    let published = 0;
    let notPublished = 0;
    let synced = 0;
    let pending = 0;

    for (const item of items) {
      const listing = listingByItem.get(item.id) ?? null;
      const integration = resolveIntegrationStatus({
        itemStatus: item.status,
        publishStatus: listing?.publishStatus ?? null,
        syncStatus: listing?.syncStatus ?? null,
      });
      if (integration === 'PUBLISHED') published += 1;
      else if (integration === 'NOT_PUBLISHED') notPublished += 1;
      if (listing?.syncStatus === 'SYNCED') synced += 1;
      const pendings = evaluatePublishReadiness({
        itemStatus: item.status,
        code: 'x',
        sku: 'x',
        erpSalePrice: dec(item.salePrice),
        useErpPrice: listing?.useErpPrice ?? true,
        priceOverride: dec(listing?.priceOverride),
        promoPrice: dec(listing?.promoPrice),
        promoStartsAt: listing?.promoStartsAt ?? null,
        promoEndsAt: listing?.promoEndsAt ?? null,
        availableQty: 1,
        trackExpiry: item.trackExpiry,
        physicalQty: dec(item.currentStock) ?? 0,
        itemId: item.id,
      });
      // recount properly below in list; for metrics use listing errors + unpublished blockers
      if (
        listing?.syncStatus === 'ERROR' ||
        (listing?.publishStatus === 'PUBLISHED' &&
          listing.syncStatus === 'PENDING')
      ) {
        pending += 1;
      } else if (!listing || listing.publishStatus === 'NOT_PUBLISHED') {
        if (dec(item.salePrice) == null) pending += 1;
      }
      void pendings;
    }

    // Recalculate pending as products with issues
    pending = 0;
    for (const item of items) {
      const listing = listingByItem.get(item.id) ?? null;
      if (listing?.syncStatus === 'ERROR') {
        pending += 1;
        continue;
      }
      if (item.status === 'INACTIVE') continue;
      if (dec(item.salePrice) == null && (listing?.useErpPrice ?? true)) {
        pending += 1;
      }
    }

    return {
      connected: true,
      channel: this.toChannelDto(channel),
      metrics: {
        publishedCount: published,
        notPublishedCount: notPublished,
        syncedCount: synced,
        pendingCount: pending,
        lastSyncAt: channel.lastSyncAt?.toISOString() ?? null,
        totalProducts: items.length,
      },
    };
  }

  async configureChannel(input: {
    name: string;
    platform?: 'GENERIC' | 'CUSTOM';
    baseUrl?: string | null;
    credentials?: string | null;
  }) {
    const existing = await this.getDefaultChannel();
    const credentialsHash = input.credentials?.trim()
      ? createHash('sha256').update(input.credentials.trim()).digest('hex')
      : (existing?.credentialsHash ?? null);
    const hasCredentials = Boolean(credentialsHash);

    if (existing) {
      return this.prisma.salesChannel.update({
        where: { id: existing.id },
        data: {
          name: input.name.trim(),
          platform: input.platform ?? existing.platform,
          baseUrl: input.baseUrl?.trim() || null,
          credentialsHash,
          hasCredentials,
          connectionStatus: 'CONNECTED',
          lastErrorMessage: null,
          isDefault: true,
        },
      });
    }

    return this.prisma.salesChannel.create({
      data: {
        name: input.name.trim() || 'Loja Online',
        platform: input.platform ?? 'GENERIC',
        baseUrl: input.baseUrl?.trim() || null,
        credentialsHash,
        hasCredentials,
        connectionStatus: 'CONNECTED',
        isDefault: true,
      },
    });
  }

  async disconnectChannel() {
    const channel = await this.getDefaultChannel();
    if (!channel) return null;
    return this.prisma.salesChannel.update({
      where: { id: channel.id },
      data: {
        connectionStatus: 'DISCONNECTED',
        credentialsHash: null,
        hasCredentials: false,
        lastErrorMessage: null,
      },
    });
  }

  async listProducts(filters: OnlineProductFilters) {
    const channel = await this.requireConnectedChannel();
    const where: Prisma.StockItemWhereInput = {
      itemType: { in: ['PRODUCT', 'OTHER'] },
    };
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.brandId) where.brandId = filters.brandId;
    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const items = await this.prisma.stockItem.findMany({
      where,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        measureUnit: { select: { code: true } },
        onlineListings: { where: { channelId: channel.id }, take: 1 },
      },
      orderBy: { description: 'asc' },
    });

    const rows: Array<ReturnType<OnlineStoreService['toProductRow']>> = [];
    for (const item of items) {
      const listing = item.onlineListings[0] ?? null;
      const physical = dec(item.currentStock) ?? 0;
      const available = await this.availableForSale(
        item.id,
        item.trackExpiry,
        physical,
      );
      const dto = this.toProductRow(
        item,
        listing,
        physical,
        available,
        channel.name,
      );
      if (
        !this.matchesProductFilters(
          dto,
          filters,
          physical,
          available,
          item.minStock,
        )
      ) {
        continue;
      }
      rows.push(dto);
    }

    const total = rows.length;
    const start = (filters.page - 1) * filters.pageSize;
    const pageRows = rows.slice(start, start + filters.pageSize);

    return {
      items: pageRows,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    };
  }

  async getProduct(itemId: string) {
    const channel = await this.requireConnectedChannel();
    const item = await this.prisma.stockItem.findUnique({
      where: { id: itemId },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        measureUnit: { select: { code: true, label: true } },
        onlineListings: { where: { channelId: channel.id }, take: 1 },
      },
    });
    if (!item) return null;

    const listing = item.onlineListings[0] ?? null;
    const physical = dec(item.currentStock) ?? 0;
    const available = await this.availableForSale(
      item.id,
      item.trackExpiry,
      physical,
    );
    const row = this.toProductRow(
      item,
      listing,
      physical,
      available,
      channel.name,
    );
    const pendings = evaluatePublishReadiness({
      itemStatus: item.status,
      code: item.code,
      sku: item.sku,
      erpSalePrice: dec(item.salePrice),
      useErpPrice: listing?.useErpPrice ?? true,
      priceOverride: dec(listing?.priceOverride),
      promoPrice: dec(listing?.promoPrice),
      promoStartsAt: listing?.promoStartsAt ?? null,
      promoEndsAt: listing?.promoEndsAt ?? null,
      availableQty: available,
      trackExpiry: item.trackExpiry,
      physicalQty: physical,
      itemId: item.id,
    });

    return {
      ...row,
      complementaryDescription: item.complementaryDescription,
      storeDescription: listing?.storeDescription ?? null,
      shortDescription: listing?.shortDescription ?? null,
      storeCategory: listing?.storeCategory ?? null,
      tags: listing?.tags ?? null,
      useErpPrice: listing?.useErpPrice ?? true,
      priceOverride: dec(listing?.priceOverride),
      promoPrice: dec(listing?.promoPrice),
      promoStartsAt: listing?.promoStartsAt?.toISOString() ?? null,
      promoEndsAt: listing?.promoEndsAt?.toISOString() ?? null,
      reservedStock: 0,
      publishedStock: dec(listing?.publishedStockQty),
      minStock: dec(item.minStock),
      trackExpiry: item.trackExpiry,
      pendings,
      stockFlow: {
        erpPhysical: physical,
        availableForSale: available,
        storePublished: dec(listing?.publishedStockQty),
        pendingSync:
          listing?.publishStatus === 'PUBLISHED' &&
          (dec(listing.publishedStockQty) ?? null) !== available,
      },
    };
  }

  async upsertListing(
    itemId: string,
    data: {
      commercialName?: string | null;
      shortDescription?: string | null;
      storeDescription?: string | null;
      storeCategory?: string | null;
      tags?: string | null;
      useErpPrice?: boolean;
      priceOverride?: number | null;
      promoPrice?: number | null;
      promoStartsAt?: string | null;
      promoEndsAt?: string | null;
    },
  ) {
    const channel = await this.requireConnectedChannel();
    const item = await this.prisma.stockItem.findUnique({
      where: { id: itemId },
    });
    if (!item) return null;

    if (
      data.promoStartsAt &&
      data.promoEndsAt &&
      new Date(data.promoStartsAt) > new Date(data.promoEndsAt)
    ) {
      throw new OnlineStoreValidationError(
        'A data inicial da promoção não pode ser posterior à final.',
      );
    }

    const listing = await this.prisma.onlineStoreListing.upsert({
      where: {
        channelId_itemId: { channelId: channel.id, itemId },
      },
      create: {
        channelId: channel.id,
        itemId,
        commercialName: data.commercialName ?? null,
        shortDescription: data.shortDescription ?? null,
        storeDescription: data.storeDescription ?? null,
        storeCategory: data.storeCategory ?? null,
        tags: data.tags ?? null,
        useErpPrice: data.useErpPrice ?? true,
        priceOverride: data.priceOverride ?? null,
        promoPrice: data.promoPrice ?? null,
        promoStartsAt: data.promoStartsAt ? new Date(data.promoStartsAt) : null,
        promoEndsAt: data.promoEndsAt ? new Date(data.promoEndsAt) : null,
        syncStatus: 'PENDING',
      },
      update: {
        commercialName: data.commercialName,
        shortDescription: data.shortDescription,
        storeDescription: data.storeDescription,
        storeCategory: data.storeCategory,
        tags: data.tags,
        useErpPrice: data.useErpPrice,
        priceOverride: data.priceOverride,
        promoPrice: data.promoPrice,
        promoStartsAt:
          data.promoStartsAt === undefined
            ? undefined
            : data.promoStartsAt
              ? new Date(data.promoStartsAt)
              : null,
        promoEndsAt:
          data.promoEndsAt === undefined
            ? undefined
            : data.promoEndsAt
              ? new Date(data.promoEndsAt)
              : null,
        syncStatus: 'PENDING',
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });

    return this.getProduct(itemId);
  }

  async publish(itemId: string) {
    const detail = await this.getProduct(itemId);
    if (!detail) return null;
    if (detail.pendings.length > 0) {
      throw new OnlineStorePublishBlockedError(detail.pendings);
    }
    const channel = await this.requireConnectedChannel();
    const available = detail.availableStock;
    await this.prisma.onlineStoreListing.upsert({
      where: { channelId_itemId: { channelId: channel.id, itemId } },
      create: {
        channelId: channel.id,
        itemId,
        publishStatus: 'PUBLISHED',
        syncStatus: 'SYNCED',
        publishedStockQty: available,
        lastSyncedAt: new Date(),
        commercialName: detail.commercialName,
      },
      update: {
        publishStatus: 'PUBLISHED',
        syncStatus: 'SYNCED',
        publishedStockQty: available,
        lastSyncedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      },
    });
    return this.getProduct(itemId);
  }

  async unpublish(itemId: string) {
    const channel = await this.requireConnectedChannel();
    await this.prisma.onlineStoreListing.upsert({
      where: { channelId_itemId: { channelId: channel.id, itemId } },
      create: {
        channelId: channel.id,
        itemId,
        publishStatus: 'NOT_PUBLISHED',
        syncStatus: 'PENDING',
        publishedStockQty: null,
      },
      update: {
        publishStatus: 'NOT_PUBLISHED',
        syncStatus: 'PENDING',
        publishedStockQty: null,
      },
    });
    return this.getProduct(itemId);
  }

  async startSync(input: {
    userId: string;
    syncProducts: boolean;
    syncStock: boolean;
    syncPrices: boolean;
  }) {
    const channel = await this.requireConnectedChannel();
    if (!input.syncProducts && !input.syncStock && !input.syncPrices) {
      throw new OnlineStoreValidationError(
        'Selecione ao menos um tipo de sincronização.',
      );
    }

    const job = await this.prisma.onlineStoreSyncJob.create({
      data: {
        channelId: channel.id,
        userId: input.userId,
        syncProducts: input.syncProducts,
        syncStock: input.syncStock,
        syncPrices: input.syncPrices,
        status: 'PENDING',
      },
      include: { user: { select: { name: true, email: true } } },
    });

    setImmediate(() => {
      void this.processSyncJob(job.id);
    });

    return this.toSyncJobDto(job);
  }

  async processSyncJob(jobId: string) {
    const job = await this.prisma.onlineStoreSyncJob.findUnique({
      where: { id: jobId },
    });
    if (!job) return;

    await this.prisma.onlineStoreSyncJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    try {
      const channel = await this.prisma.salesChannel.findUnique({
        where: { id: job.channelId },
      });
      if (!channel || channel.connectionStatus !== 'CONNECTED') {
        throw new Error('Canal desconectado.');
      }

      const items = await this.prisma.stockItem.findMany({
        where: { itemType: { in: ['PRODUCT', 'OTHER'] } },
        include: {
          onlineListings: { where: { channelId: channel.id }, take: 1 },
        },
      });

      let processed = 0;
      let success = 0;
      let errors = 0;
      let stockUpdated = 0;
      let pricesUpdated = 0;
      let pendingCount = 0;

      for (const item of items) {
        processed += 1;
        const listing = item.onlineListings[0] ?? null;
        const physical = dec(item.currentStock) ?? 0;
        const available = await this.availableForSale(
          item.id,
          item.trackExpiry,
          physical,
        );
        const pendings = evaluatePublishReadiness({
          itemStatus: item.status,
          code: item.code,
          sku: item.sku,
          erpSalePrice: dec(item.salePrice),
          useErpPrice: listing?.useErpPrice ?? true,
          priceOverride: dec(listing?.priceOverride),
          promoPrice: dec(listing?.promoPrice),
          promoStartsAt: listing?.promoStartsAt ?? null,
          promoEndsAt: listing?.promoEndsAt ?? null,
          availableQty: available,
          trackExpiry: item.trackExpiry,
          physicalQty: physical,
          itemId: item.id,
        });

        if (pendings.length > 0) pendingCount += 1;

        if (listing?.publishStatus !== 'PUBLISHED') {
          if (job.syncProducts) {
            await this.prisma.onlineStoreListing.upsert({
              where: {
                channelId_itemId: { channelId: channel.id, itemId: item.id },
              },
              create: {
                channelId: channel.id,
                itemId: item.id,
                publishStatus: 'NOT_PUBLISHED',
                syncStatus: pendings.length ? 'ERROR' : 'PENDING',
                lastErrorCode: pendings[0]?.code ?? null,
                lastErrorMessage: pendings[0]?.message ?? null,
              },
              update: {
                syncStatus: pendings.length ? 'ERROR' : 'PENDING',
                lastErrorCode: pendings[0]?.code ?? null,
                lastErrorMessage: pendings[0]?.message ?? null,
              },
            });
          }
          success += 1;
          continue;
        }

        if (pendings.length > 0) {
          errors += 1;
          await this.prisma.onlineStoreListing.update({
            where: { id: listing.id },
            data: {
              syncStatus: 'ERROR',
              lastErrorCode: pendings[0]?.code ?? 'PUBLISH_BLOCKED',
              lastErrorMessage:
                pendings[0]?.message ?? friendlySyncError('PUBLISH_BLOCKED'),
            },
          });
          continue;
        }

        const data: Prisma.OnlineStoreListingUpdateInput = {
          syncStatus: 'SYNCED',
          lastSyncedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        };

        if (job.syncStock) {
          data.publishedStockQty = available;
          stockUpdated += 1;
        }
        if (job.syncPrices) {
          pricesUpdated += 1;
        }

        await this.prisma.onlineStoreListing.update({
          where: { id: listing.id },
          data,
        });
        success += 1;
      }

      const status = errors > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED';

      await this.prisma.onlineStoreSyncJob.update({
        where: { id: jobId },
        data: {
          status,
          productsProcessed: processed,
          productsSuccess: success,
          productsError: errors,
          stockUpdated,
          pricesUpdated,
          pendingCount,
          completedAt: new Date(),
          summaryJson: {
            productsProcessed: processed,
            productsSuccess: success,
            productsError: errors,
            stockUpdated,
            pricesUpdated,
            pendingCount,
          },
        },
      });

      await this.prisma.salesChannel.update({
        where: { id: channel.id },
        data: { lastSyncAt: new Date(), lastErrorMessage: null },
      });
    } catch (error) {
      await this.prisma.onlineStoreSyncJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage:
            error instanceof Error
              ? 'Não foi possível concluir a sincronização.'
              : 'Não foi possível concluir a sincronização.',
        },
      });
    }
  }

  async listSyncJobs(page: number, pageSize: number) {
    const channel = await this.getDefaultChannel();
    if (!channel) {
      return { items: [], total: 0, page, pageSize, totalPages: 1 };
    }
    const where = { channelId: channel.id };
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.onlineStoreSyncJob.count({ where }),
      this.prisma.onlineStoreSyncJob.findMany({
        where,
        include: { user: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: rows.map((row) => this.toSyncJobDto(row)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getSyncJob(id: string) {
    const row = await this.prisma.onlineStoreSyncJob.findUnique({
      where: { id },
      include: { user: { select: { name: true, email: true } } },
    });
    return row ? this.toSyncJobDto(row) : null;
  }

  private async requireConnectedChannel() {
    const channel = await this.getDefaultChannel();
    if (!channel || channel.connectionStatus !== 'CONNECTED') {
      throw new OnlineStoreDisconnectedError();
    }
    return channel;
  }

  private async availableForSale(
    itemId: string,
    trackExpiry: boolean,
    physical: number,
  ): Promise<number> {
    if (!trackExpiry) return Math.max(0, physical);
    const today = toUtcDateOnly(new Date());
    const agg = await this.prisma.stockLot.aggregate({
      where: {
        itemId,
        expiryDate: { gte: today },
        quantity: { gt: 0 },
      },
      _sum: { quantity: true },
    });
    return Math.max(0, dec(agg._sum.quantity) ?? 0);
  }

  private matchesProductFilters(
    dto: ReturnType<OnlineStoreService['toProductRow']>,
    filters: OnlineProductFilters,
    physical: number,
    available: number,
    minStock: unknown,
  ): boolean {
    if (filters.status && filters.status !== 'ALL') {
      if (dto.integrationStatus !== filters.status) return false;
    }
    if (filters.sync && filters.sync !== 'ALL') {
      if ((dto.syncStatus ?? 'PENDING') !== filters.sync) return false;
    }
    if (filters.publish && filters.publish !== 'ALL') {
      if ((dto.publishStatus ?? 'NOT_PUBLISHED') !== filters.publish) {
        return false;
      }
    }
    if (filters.stock && filters.stock !== 'ALL') {
      if (filters.stock === 'WITH_STOCK' && available <= 0) return false;
      if (filters.stock === 'WITHOUT_STOCK' && available > 0) return false;
      if (filters.stock === 'LOW_STOCK') {
        const min = dec(minStock);
        if (min == null || available > min) return false;
      }
    }
    void physical;
    return true;
  }

  private toProductRow(
    item: {
      id: string;
      code: string;
      description: string;
      sku: string | null;
      barcode: string | null;
      status: 'ACTIVE' | 'INACTIVE';
      salePrice: unknown;
      category?: { name: string } | null;
      brand?: { name: string } | null;
      measureUnit?: { code: string } | null;
    },
    listing: {
      commercialName: string | null;
      publishStatus: OnlineListingPublishStatus;
      syncStatus: OnlineListingSyncStatus;
      publishedStockQty: unknown;
      lastSyncedAt: Date | null;
      lastErrorCode: string | null;
      lastErrorMessage: string | null;
      useErpPrice: boolean;
      priceOverride: unknown;
    } | null,
    physical: number,
    available: number,
    channelName: string,
  ) {
    const erpPrice = dec(item.salePrice);
    const storePrice =
      listing && !listing.useErpPrice ? dec(listing.priceOverride) : erpPrice;
    const integrationStatus = resolveIntegrationStatus({
      itemStatus: item.status,
      publishStatus: listing?.publishStatus ?? null,
      syncStatus: listing?.syncStatus ?? null,
    });

    return {
      itemId: item.id,
      code: item.code,
      description: item.description,
      commercialName: listing?.commercialName ?? item.description,
      sku: item.sku,
      barcode: item.barcode,
      categoryName: item.category?.name ?? null,
      brandName: item.brand?.name ?? null,
      measureUnitCode: item.measureUnit?.code ?? null,
      itemStatus: item.status,
      erpSalePrice: erpPrice,
      storePrice,
      physicalStock: physical,
      availableStock: available,
      publishedStock: dec(listing?.publishedStockQty),
      publishStatus: listing?.publishStatus ?? 'NOT_PUBLISHED',
      syncStatus: listing?.syncStatus ?? null,
      integrationStatus,
      lastSyncedAt: listing?.lastSyncedAt?.toISOString() ?? null,
      channelName,
      errorMessage:
        listing?.lastErrorMessage ??
        (listing?.lastErrorCode
          ? friendlySyncError(listing.lastErrorCode)
          : null),
      imageUrl: null as string | null,
    };
  }

  private toChannelDto(channel: {
    id: string;
    name: string;
    platform: string;
    baseUrl: string | null;
    connectionStatus: string;
    hasCredentials: boolean;
    lastSyncAt: Date | null;
    lastErrorMessage: string | null;
  }) {
    return {
      id: channel.id,
      name: channel.name,
      platform: channel.platform,
      baseUrl: channel.baseUrl,
      connectionStatus: channel.connectionStatus,
      hasCredentials: channel.hasCredentials,
      lastSyncAt: channel.lastSyncAt?.toISOString() ?? null,
      lastErrorMessage: channel.lastErrorMessage,
      // never expose credentialsHash
    };
  }

  private toSyncJobDto(job: {
    id: string;
    sequentialId: number;
    syncProducts: boolean;
    syncStock: boolean;
    syncPrices: boolean;
    status: string;
    productsProcessed: number;
    productsSuccess: number;
    productsError: number;
    stockUpdated: number;
    pricesUpdated: number;
    pendingCount: number;
    summaryJson: unknown;
    errorMessage: string | null;
    startedAt: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    user?: { name: string; email: string } | null;
  }) {
    return {
      id: job.id,
      sequentialId: job.sequentialId,
      syncProducts: job.syncProducts,
      syncStock: job.syncStock,
      syncPrices: job.syncPrices,
      status: job.status,
      productsProcessed: job.productsProcessed,
      productsSuccess: job.productsSuccess,
      productsError: job.productsError,
      stockUpdated: job.stockUpdated,
      pricesUpdated: job.pricesUpdated,
      pendingCount: job.pendingCount,
      summary: job.summaryJson,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      userName: job.user?.name ?? null,
      userEmail: job.user?.email ?? null,
    };
  }
}

export class OnlineStoreDisconnectedError extends Error {
  readonly code = 'STORE_DISCONNECTED';
  constructor() {
    super('A loja online ainda não está conectada.');
    this.name = 'OnlineStoreDisconnectedError';
  }
}

export class OnlineStoreValidationError extends Error {
  readonly code = 'STORE_VALIDATION';
  constructor(message: string) {
    super(message);
    this.name = 'OnlineStoreValidationError';
  }
}

export class OnlineStorePublishBlockedError extends Error {
  readonly code = 'PUBLISH_BLOCKED';
  readonly pendings: OnlineStorePending[];
  constructor(pendings: OnlineStorePending[]) {
    super('Não é possível publicar este produto.');
    this.name = 'OnlineStorePublishBlockedError';
    this.pendings = pendings;
  }
}

/** Evita tree-shaking de randomBytes se credentials vazios — mantém import usado. */
export function generateOpaqueToken(): string {
  return randomBytes(24).toString('hex');
}
