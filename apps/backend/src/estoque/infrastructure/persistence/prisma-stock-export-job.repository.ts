import { Injectable } from '@nestjs/common';
import type { Prisma, StockExportStatus as PrismaStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  CreateExportJobData,
  ExportJobRecord,
  ListExportJobsFilter,
  StockExportJobRepository,
} from '../../domain/ports/stock-export-job.repository';
import type { ExportFilters } from '../../domain/export/export-types';

function mapJob(
  row: Prisma.StockExportJobGetPayload<{ include: { user: true } }>,
): ExportJobRecord {
  return {
    id: row.id,
    sequentialId: row.sequentialId,
    userId: row.userId,
    type: row.type,
    format: row.format,
    status: row.status,
    fileName: row.fileName,
    storedPath: row.storedPath,
    mimeType: row.mimeType,
    fileSizeBytes: row.fileSizeBytes,
    recordCount: row.recordCount,
    filters: row.filtersJson as ExportFilters,
    columns: row.columnsJson as string[],
    sortBy: row.sortBy,
    sortDir: row.sortDir,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    expiresAt: row.expiresAt,
    downloadedAt: row.downloadedAt,
    cancelledAt: row.cancelledAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
  };
}

const includeUser = { user: true } satisfies Prisma.StockExportJobInclude;

@Injectable()
export class PrismaStockExportJobRepository implements StockExportJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateExportJobData): Promise<ExportJobRecord> {
    const row = await this.prisma.stockExportJob.create({
      data: {
        userId: data.userId,
        type: data.type,
        format: data.format,
        fileName: data.fileName,
        filtersJson: data.filters as Prisma.InputJsonValue,
        columnsJson: data.columns as Prisma.InputJsonValue,
        sortBy: data.sortBy,
        sortDir: data.sortDir,
        status: 'PENDING',
      },
      include: includeUser,
    });
    return mapJob(row);
  }

  async findById(id: string): Promise<ExportJobRecord | null> {
    const row = await this.prisma.stockExportJob.findUnique({
      where: { id },
      include: includeUser,
    });
    return row ? mapJob(row) : null;
  }

  async list(filter: ListExportJobsFilter) {
    const where: Prisma.StockExportJobWhereInput = {};
    if (filter.userId) where.userId = filter.userId;

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockExportJob.count({ where }),
      this.prisma.stockExportJob.findMany({
        where,
        include: includeUser,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
    ]);

    return { items: rows.map(mapJob), total };
  }

  async countActiveByUser(userId: string): Promise<number> {
    return this.prisma.stockExportJob.count({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });
  }

  async markProcessing(id: string): Promise<ExportJobRecord | null> {
    return this.updateStatus(id, 'PROCESSING', {
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    });
  }

  async markCompleted(
    id: string,
    data: {
      storedPath: string;
      mimeType: string;
      fileSizeBytes: number;
      recordCount: number;
      expiresAt: Date;
    },
  ): Promise<ExportJobRecord | null> {
    return this.updateStatus(id, 'COMPLETED', {
      ...data,
      completedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    });
  }

  async markFailed(
    id: string,
    errorCode: string,
    errorMessage: string,
  ): Promise<ExportJobRecord | null> {
    return this.updateStatus(id, 'FAILED', {
      completedAt: new Date(),
      errorCode,
      errorMessage,
    });
  }

  async markCancelled(id: string): Promise<ExportJobRecord | null> {
    return this.updateStatus(id, 'CANCELLED', {
      cancelledAt: new Date(),
      completedAt: new Date(),
    });
  }

  async markExpired(id: string): Promise<ExportJobRecord | null> {
    return this.updateStatus(id, 'EXPIRED', {});
  }

  async markDownloaded(id: string): Promise<void> {
    await this.prisma.stockExportJob.update({
      where: { id },
      data: { downloadedAt: new Date() },
    });
  }

  async isCancelRequested(id: string): Promise<boolean> {
    const row = await this.prisma.stockExportJob.findUnique({
      where: { id },
      select: { status: true },
    });
    return row?.status === 'CANCELLED';
  }

  private async updateStatus(
    id: string,
    status: PrismaStatus,
    data: Prisma.StockExportJobUpdateInput,
  ): Promise<ExportJobRecord | null> {
    try {
      const row = await this.prisma.stockExportJob.update({
        where: { id },
        data: { status, ...data },
        include: includeUser,
      });
      return mapJob(row);
    } catch {
      return null;
    }
  }
}
