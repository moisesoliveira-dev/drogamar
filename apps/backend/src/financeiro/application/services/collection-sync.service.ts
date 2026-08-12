import { Injectable } from '@nestjs/common';
import type { CollectionCaseStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  calculateReceivableMoney,
  daysOverdue,
  resolveDisplayStatus,
  toUtcDateOnly,
} from '../../domain/receivable/receivable-money';
import { computePriorityScore } from '../../domain/collection/collection-priority';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

const OPEN_CASE_STATUSES: CollectionCaseStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'CONTACTED',
  'PROMISED',
  'NO_RESPONSE',
];

@Injectable()
export class CollectionSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async syncCaseByReceivableId(receivableId: string): Promise<void> {
    const items = await this.prisma.collectionItem.findMany({
      where: { receivableId, removedAt: null },
      select: { caseId: true },
    });
    const caseIds = [...new Set(items.map((i) => i.caseId))];
    for (const caseId of caseIds) {
      await this.refreshCase(caseId);
    }
  }

  async refreshCase(caseId: string): Promise<void> {
    const collectionCase = await this.prisma.collectionCase.findUnique({
      where: { id: caseId },
      include: {
        items: {
          where: { removedAt: null },
          include: { receivable: true },
        },
        promises: {
          where: { status: { in: ['PENDING', 'OVERDUE'] } },
        },
      },
    });
    if (!collectionCase) return;
    const previousStatus: CollectionCaseStatus = collectionCase.status;
    if (
      collectionCase.status === 'CANCELLED' ||
      collectionCase.status === 'RESOLVED'
    ) {
      return;
    }

    const today = toUtcDateOnly(new Date());
    const receivables = collectionCase.items.map((i) => i.receivable);

    let overdueAmount = 0;
    let maxDaysOverdue = 0;
    let overdueAccounts = 0;
    let allTerminal = receivables.length > 0;
    let anyOpenBalance = false;

    for (const row of receivables) {
      const money = calculateReceivableMoney({
        originalAmount: dec(row.originalAmount),
        discountAmount: dec(row.discountAmount),
        interestAmount: dec(row.interestAmount),
        fineAmount: dec(row.fineAmount),
        paidAmount: dec(row.paidAmount),
      });
      const display = resolveDisplayStatus({
        status: row.status,
        dueDate: row.dueDate,
        balance: money.balance,
        today,
      });
      const terminal =
        row.status === 'SETTLED' ||
        row.status === 'CANCELLED' ||
        row.status === 'RENEGOTIATED' ||
        money.balance <= 0.0001;
      if (!terminal) {
        allTerminal = false;
        anyOpenBalance = true;
      }
      if (display === 'OVERDUE' && money.balance > 0.0001) {
        overdueAmount += money.balance;
        overdueAccounts += 1;
        maxDaysOverdue = Math.max(
          maxDaysOverdue,
          daysOverdue(row.dueDate, today),
        );
      }
    }

    for (const promise of collectionCase.promises) {
      if (promise.status !== 'PENDING') continue;
      const promisedDate = toUtcDateOnly(promise.promisedDate);
      if (promisedDate.getTime() < today.getTime() && anyOpenBalance) {
        await this.prisma.paymentPromise.update({
          where: { id: promise.id },
          data: { status: 'OVERDUE' },
        });
      }
    }

    // Heurística: promessa KEPT se ARs liquidadas OU recibos desde a promessa cobrem o valor.
    const pendingOrOverdue = await this.prisma.paymentPromise.findMany({
      where: { caseId, status: { in: ['PENDING', 'OVERDUE'] } },
    });
    for (const promise of pendingOrOverdue) {
      if (allTerminal) {
        await this.prisma.paymentPromise.update({
          where: { id: promise.id },
          data: { status: 'KEPT' },
        });
        continue;
      }
      const receiptAgg = await this.prisma.receivableMovement.aggregate({
        where: {
          type: 'RECEIPT',
          createdAt: { gte: promise.createdAt },
          receivableId: { in: receivables.map((r) => r.id) },
          reversedBy: { none: {} },
        },
        _sum: { amount: true },
      });
      const receivedSince = dec(receiptAgg._sum.amount);
      if (receivedSince + 0.0001 >= dec(promise.promisedAmount)) {
        await this.prisma.paymentPromise.update({
          where: { id: promise.id },
          data: { status: 'KEPT' },
        });
      }
    }

    const broken = await this.prisma.paymentPromise.count({
      where: { caseId, status: 'OVERDUE' },
    });

    const priorityScore = computePriorityScore({
      overdueAmount,
      maxDaysOverdue,
      overdueAccounts,
      hasBrokenPromise: broken > 0,
    });

    let nextStatus: CollectionCaseStatus = collectionCase.status;
    let closedAt: Date | null = collectionCase.closedAt;

    if (allTerminal || (!anyOpenBalance && receivables.length > 0)) {
      nextStatus = 'RESOLVED';
      closedAt = closedAt ?? new Date();
    } else if (
      collectionCase.status === 'PROMISED' ||
      collectionCase.status === 'CONTACTED' ||
      collectionCase.status === 'NO_RESPONSE' ||
      collectionCase.status === 'IN_PROGRESS' ||
      collectionCase.status === 'PENDING'
    ) {
      // PARTIAL stays IN_PROGRESS/PROMISED — keep PROMISED if still has active promise
      const activePromise = await this.prisma.paymentPromise.count({
        where: { caseId, status: { in: ['PENDING', 'OVERDUE'] } },
      });
      if (activePromise > 0) {
        nextStatus = 'PROMISED';
      } else if (collectionCase.status === 'PENDING' && overdueAccounts > 0) {
        nextStatus = 'IN_PROGRESS';
      }
    }

    const data: Prisma.CollectionCaseUpdateInput = {
      priorityScore,
      status: nextStatus,
      closedAt,
    };

    await this.prisma.collectionCase.update({
      where: { id: caseId },
      data,
    });

    if (nextStatus === 'RESOLVED' && previousStatus !== 'RESOLVED') {
      await this.prisma.collectionAuditLog.create({
        data: {
          caseId,
          actorId: collectionCase.createdById,
          action: 'AUTO_RESOLVE',
          message:
            'Caso resolvido automaticamente após liquidação dos títulos.',
        },
      });
    }
  }

  isOpenStatus(status: CollectionCaseStatus): boolean {
    return OPEN_CASE_STATUSES.includes(status);
  }
}
