import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type {
  CashFlowDirection,
  CashFlowKind,
  CashFlowOrigin,
  CashFlowStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CashFlowNotFoundError,
  CashFlowValidationError,
} from '../../domain/cash-flow/errors';
import {
  isOperationalKind,
  netEffect,
  roundMoney,
  toUtcDateOnly,
} from '../../domain/cash-flow/cash-flow-money';
import { CashFlowLedgerService } from './cash-flow-ledger.service';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function pctChange(current: number, previous: number): number | null {
  if (Math.abs(previous) < 0.0001) {
    if (Math.abs(current) < 0.0001) return 0;
    return null;
  }
  return roundMoney(((current - previous) / Math.abs(previous)) * 100);
}

const movementInclude = {
  bankAccount: { select: { id: true, code: true, name: true, kind: true } },
  category: { select: { id: true, code: true, name: true } },
  costCenter: { select: { id: true, code: true, name: true } },
  operator: { select: { id: true, name: true, email: true } },
  auditLogs: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
} satisfies Prisma.CashFlowMovementInclude;

export type CashFlowPeriodFilters = {
  period?: string;
  from?: string;
  to?: string;
  bankAccountId?: string;
  categoryId?: string;
  costCenterId?: string;
  direction?: string;
  status?: string;
  origin?: string;
  kind?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class FluxoCaixaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: CashFlowLedgerService,
  ) {}

  async getLookups() {
    const [bankAccounts, categories, costCenters] = await Promise.all([
      this.prisma.bankAccount.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.expenseCategory.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.costCenter.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      bankAccounts: bankAccounts.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        kind: a.kind,
        bankName: a.bankName,
      })),
      categories: categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      })),
      costCenters: costCenters.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      })),
    };
  }

  async dashboard(filters: CashFlowPeriodFilters) {
    const { from, to } = this.resolvePeriod(filters);
    const prev = this.previousPeriod(from, to);
    const accountFilter = this.accountWhere(filters);

    const [allRealized, periodRows, prevRows, projections] = await Promise.all([
      this.prisma.cashFlowMovement.findMany({
        where: { status: 'REALIZED', ...accountFilter },
        select: {
          direction: true,
          kind: true,
          amount: true,
          occurredAt: true,
        },
      }),
      this.prisma.cashFlowMovement.findMany({
        where: {
          status: 'REALIZED',
          occurredAt: { gte: from, lte: to },
          ...accountFilter,
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.costCenterId
            ? { costCenterId: filters.costCenterId }
            : {}),
        },
        select: {
          direction: true,
          kind: true,
          amount: true,
          occurredAt: true,
        },
      }),
      this.prisma.cashFlowMovement.findMany({
        where: {
          status: 'REALIZED',
          occurredAt: { gte: prev.from, lte: prev.to },
          ...accountFilter,
          ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
          ...(filters.costCenterId
            ? { costCenterId: filters.costCenterId }
            : {}),
        },
        select: { direction: true, kind: true, amount: true },
      }),
      this.loadProjectionItems(filters.bankAccountId, from, to),
    ]);

    const currentBalance = roundMoney(
      allRealized.reduce(
        (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
        0,
      ),
    );

    const openingBalance = roundMoney(
      allRealized
        .filter((m) => toUtcDateOnly(m.occurredAt) < from)
        .reduce((sum, m) => sum + netEffect(m.direction, dec(m.amount)), 0),
    );

    const periodInflows = roundMoney(
      periodRows
        .filter((m) => m.direction === 'IN' && isOperationalKind(m.kind))
        .reduce((sum, m) => sum + dec(m.amount), 0),
    );
    const periodOutflows = roundMoney(
      periodRows
        .filter((m) => m.direction === 'OUT' && isOperationalKind(m.kind))
        .reduce((sum, m) => sum + dec(m.amount), 0),
    );
    const result = roundMoney(periodInflows - periodOutflows);

    const periodNetAll = roundMoney(
      periodRows.reduce(
        (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
        0,
      ),
    );
    const closingBalanceRealized = roundMoney(openingBalance + periodNetAll);

    const toReceive = roundMoney(
      projections
        .filter((p) => p.direction === 'IN')
        .reduce((s, p) => s + p.amount, 0),
    );
    const toPay = roundMoney(
      projections
        .filter((p) => p.direction === 'OUT')
        .reduce((s, p) => s + p.amount, 0),
    );
    const projectedBalance = roundMoney(currentBalance + toReceive - toPay);

    let running = currentBalance;
    let minProjectedBalance = currentBalance;
    let minProjectedDate: string | null = null;
    const byDate = new Map<string, { inflows: number; outflows: number }>();
    for (const p of projections) {
      const key = isoDate(p.date);
      const bucket = byDate.get(key) ?? { inflows: 0, outflows: 0 };
      if (p.direction === 'IN')
        bucket.inflows = roundMoney(bucket.inflows + p.amount);
      else bucket.outflows = roundMoney(bucket.outflows + p.amount);
      byDate.set(key, bucket);
    }
    const sortedDates = [...byDate.keys()].sort();
    for (const date of sortedDates) {
      const b = byDate.get(date)!;
      running = roundMoney(running + b.inflows - b.outflows);
      if (running < minProjectedBalance) {
        minProjectedBalance = running;
        minProjectedDate = date;
      }
    }

    const previousInflows = roundMoney(
      prevRows
        .filter((m) => m.direction === 'IN' && isOperationalKind(m.kind))
        .reduce((sum, m) => sum + dec(m.amount), 0),
    );
    const previousOutflows = roundMoney(
      prevRows
        .filter((m) => m.direction === 'OUT' && isOperationalKind(m.kind))
        .reduce((sum, m) => sum + dec(m.amount), 0),
    );
    const previousResult = roundMoney(previousInflows - previousOutflows);

    return {
      from: isoDate(from),
      to: isoDate(to),
      currentBalance,
      periodInflows,
      periodOutflows,
      result,
      projectedBalance,
      openingBalance,
      closingBalanceRealized,
      toReceive,
      toPay,
      risk:
        projectedBalance < 0 || minProjectedBalance < 0
          ? {
              projectedNegative: projectedBalance < 0,
              minProjectedBalance,
              minProjectedDate,
            }
          : null,
      comparison: {
        previousInflows,
        previousOutflows,
        previousResult,
        inflowsChangePct: pctChange(periodInflows, previousInflows),
        outflowsChangePct: pctChange(periodOutflows, previousOutflows),
        resultChangePct: pctChange(result, previousResult),
      },
    };
  }

  async series(filters: CashFlowPeriodFilters & { groupBy?: string }) {
    const { from, to } = this.resolvePeriod(filters);
    const groupBy = (filters.groupBy ?? 'day') as 'day' | 'week' | 'month';
    const accountFilter = this.accountWhere(filters);

    const [realizedBefore, periodRows, projections] = await Promise.all([
      this.prisma.cashFlowMovement.findMany({
        where: {
          status: 'REALIZED',
          occurredAt: { lt: from },
          ...accountFilter,
        },
        select: { direction: true, amount: true },
      }),
      this.prisma.cashFlowMovement.findMany({
        where: {
          status: 'REALIZED',
          occurredAt: { gte: from, lte: to },
          ...accountFilter,
        },
        select: {
          direction: true,
          kind: true,
          amount: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: 'asc' },
      }),
      this.loadProjectionItems(filters.bankAccountId, from, to),
    ]);

    let balanceRealized = roundMoney(
      realizedBefore.reduce(
        (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
        0,
      ),
    );

    const buckets = new Map<
      string,
      { inflows: number; outflows: number; netAll: number }
    >();

    const ensureBucket = (key: string) => {
      if (!buckets.has(key)) {
        buckets.set(key, { inflows: 0, outflows: 0, netAll: 0 });
      }
      return buckets.get(key)!;
    };

    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      ensureBucket(this.bucketKey(d, groupBy));
    }

    for (const m of periodRows) {
      const key = this.bucketKey(toUtcDateOnly(m.occurredAt), groupBy);
      const b = ensureBucket(key);
      const amount = dec(m.amount);
      b.netAll = roundMoney(b.netAll + netEffect(m.direction, amount));
      if (isOperationalKind(m.kind)) {
        if (m.direction === 'IN') b.inflows = roundMoney(b.inflows + amount);
        else b.outflows = roundMoney(b.outflows + amount);
      }
    }

    const projByBucket = new Map<string, number>();
    for (const p of projections) {
      const key = this.bucketKey(p.date, groupBy);
      const delta = p.direction === 'IN' ? p.amount : -p.amount;
      projByBucket.set(key, roundMoney((projByBucket.get(key) ?? 0) + delta));
    }

    const keys = [...buckets.keys()].sort();
    let balanceProjected = balanceRealized;
    const points = keys.map((date) => {
      const b = buckets.get(date)!;
      balanceRealized = roundMoney(balanceRealized + b.netAll);
      balanceProjected = roundMoney(
        balanceProjected + b.netAll + (projByBucket.get(date) ?? 0),
      );
      return {
        date,
        inflows: b.inflows,
        outflows: b.outflows,
        result: roundMoney(b.inflows - b.outflows),
        balanceRealized,
        balanceProjected,
      };
    });

    return { from: isoDate(from), to: isoDate(to), groupBy, points };
  }

  async projection(filters: CashFlowPeriodFilters) {
    const today = toUtcDateOnly(new Date());
    const from = filters.from ? toUtcDateOnly(filters.from) : today;
    const to = filters.to ? toUtcDateOnly(filters.to) : addDays(today, 30);
    if (to < from) {
      throw new CashFlowValidationError(
        'Período de projeção inválido.',
        'INVALID_PERIOD',
      );
    }

    const accountFilter = this.accountWhere(filters);
    const realized = await this.prisma.cashFlowMovement.findMany({
      where: { status: 'REALIZED', ...accountFilter },
      select: { direction: true, amount: true },
    });
    const currentBalance = roundMoney(
      realized.reduce(
        (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
        0,
      ),
    );

    const items = await this.loadProjectionItems(
      filters.bankAccountId,
      from,
      to,
    );
    const toReceive = roundMoney(
      items
        .filter((i) => i.direction === 'IN')
        .reduce((s, i) => s + i.amount, 0),
    );
    const toPay = roundMoney(
      items
        .filter((i) => i.direction === 'OUT')
        .reduce((s, i) => s + i.amount, 0),
    );
    const projectedBalance = roundMoney(currentBalance + toReceive - toPay);

    const byDateMap = new Map<string, { inflows: number; outflows: number }>();
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      byDateMap.set(isoDate(d), { inflows: 0, outflows: 0 });
    }
    for (const item of items) {
      const key = isoDate(item.date);
      const bucket = byDateMap.get(key) ?? { inflows: 0, outflows: 0 };
      if (item.direction === 'IN') {
        bucket.inflows = roundMoney(bucket.inflows + item.amount);
      } else {
        bucket.outflows = roundMoney(bucket.outflows + item.amount);
      }
      byDateMap.set(key, bucket);
    }

    let running = currentBalance;
    const byDate = [...byDateMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, b]) => {
        running = roundMoney(running + b.inflows - b.outflows);
        return {
          date,
          inflows: b.inflows,
          outflows: b.outflows,
          result: roundMoney(b.inflows - b.outflows),
          projectedBalance: running,
        };
      });

    const upcoming = items
      .slice()
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 50)
      .map((i) => ({
        date: isoDate(i.date),
        direction: i.direction,
        amount: i.amount,
        description: i.description,
        origin: i.origin,
        originId: i.originId,
      }));

    return {
      from: isoDate(from),
      to: isoDate(to),
      currentBalance,
      toReceive,
      toPay,
      projectedBalance,
      byDate,
      upcoming,
    };
  }

  async listMovements(filters: CashFlowPeriodFilters) {
    const { from, to } = this.resolvePeriod(filters);
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const where = this.movementWhere(filters, from, to);

    const [total, items, beforeRows, periodOrdered] = await Promise.all([
      this.prisma.cashFlowMovement.count({ where }),
      this.prisma.cashFlowMovement.findMany({
        where,
        include: {
          bankAccount: {
            select: { id: true, code: true, name: true, kind: true },
          },
          category: { select: { id: true, code: true, name: true } },
          costCenter: { select: { id: true, code: true, name: true } },
          operator: { select: { id: true, name: true } },
        },
        orderBy: [{ occurredAt: 'desc' }, { sequentialId: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.cashFlowMovement.findMany({
        where: {
          status: 'REALIZED',
          occurredAt: { lt: from },
          ...this.accountWhere(filters),
        },
        select: { direction: true, amount: true },
      }),
      this.prisma.cashFlowMovement.findMany({
        where: {
          ...this.accountWhere(filters),
          occurredAt: { gte: from, lte: to },
          status: {
            in: this.statusList(filters.status) ?? [
              'REALIZED',
              'REVERSED',
              'CANCELLED',
            ],
          },
        },
        select: {
          id: true,
          direction: true,
          amount: true,
          status: true,
          occurredAt: true,
          sequentialId: true,
        },
        orderBy: [{ occurredAt: 'asc' }, { sequentialId: 'asc' }],
      }),
    ]);

    let running = roundMoney(
      beforeRows.reduce(
        (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
        0,
      ),
    );
    const runningById = new Map<string, number>();
    for (const m of periodOrdered) {
      if (m.status === 'REALIZED') {
        running = roundMoney(running + netEffect(m.direction, dec(m.amount)));
      }
      runningById.set(m.id, running);
    }

    return {
      items: items.map((m) =>
        this.mapListItem(m, runningById.get(m.id) ?? null),
      ),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getById(id: string) {
    const row = await this.prisma.cashFlowMovement.findUnique({
      where: { id },
      include: movementInclude,
    });
    if (!row) throw new CashFlowNotFoundError();
    return this.mapDetail(row);
  }

  async analysisByCategory(
    filters: CashFlowPeriodFilters & { direction?: string },
  ) {
    const { from, to } = this.resolvePeriod(filters);
    const direction = (filters.direction ?? 'OUT') as CashFlowDirection;
    if (direction !== 'IN' && direction !== 'OUT') {
      throw new CashFlowValidationError(
        'Direção inválida para análise.',
        'INVALID_DIRECTION',
      );
    }

    const rows = await this.prisma.cashFlowMovement.findMany({
      where: {
        status: 'REALIZED',
        direction,
        kind: { not: 'TRANSFER' },
        occurredAt: { gte: from, lte: to },
        ...this.accountWhere(filters),
      },
      include: {
        category: { select: { id: true, code: true, name: true } },
      },
    });

    const byKey = new Map<
      string,
      {
        categoryId: string | null;
        categoryName: string;
        origin: string;
        amount: number;
        count: number;
      }
    >();

    for (const row of rows) {
      const catId = row.categoryId ?? 'NONE';
      const key = `${catId}::${row.origin}`;
      const current = byKey.get(key) ?? {
        categoryId: row.categoryId,
        categoryName: row.category?.name ?? 'Sem categoria',
        origin: row.origin,
        amount: 0,
        count: 0,
      };
      current.amount = roundMoney(current.amount + dec(row.amount));
      current.count += 1;
      byKey.set(key, current);
    }

    const items = [...byKey.values()].sort((a, b) => b.amount - a.amount);
    const total = roundMoney(items.reduce((s, i) => s + i.amount, 0));

    return {
      from: isoDate(from),
      to: isoDate(to),
      direction,
      total,
      items: items.map((i) => ({
        ...i,
        sharePct: total > 0 ? roundMoney((i.amount / total) * 100) : 0,
      })),
    };
  }

  async balancesByAccount(filters: CashFlowPeriodFilters) {
    const { from, to } = this.resolvePeriod(filters);
    const accounts = await this.prisma.bankAccount.findMany({
      where: {
        active: true,
        ...(filters.bankAccountId ? { id: filters.bankAccountId } : {}),
      },
      orderBy: { name: 'asc' },
    });

    const movements = await this.prisma.cashFlowMovement.findMany({
      where: {
        status: 'REALIZED',
        bankAccountId: { in: accounts.map((a) => a.id) },
      },
      select: {
        bankAccountId: true,
        direction: true,
        kind: true,
        amount: true,
        occurredAt: true,
      },
    });

    return {
      from: isoDate(from),
      to: isoDate(to),
      items: accounts.map((account) => {
        const rows = movements.filter((m) => m.bankAccountId === account.id);
        const balance = roundMoney(
          rows.reduce(
            (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
            0,
          ),
        );
        const inPeriod = rows.filter((m) => {
          const d = toUtcDateOnly(m.occurredAt);
          return d >= from && d <= to;
        });
        const inflows = roundMoney(
          inPeriod
            .filter((m) => m.direction === 'IN' && isOperationalKind(m.kind))
            .reduce((s, m) => s + dec(m.amount), 0),
        );
        const outflows = roundMoney(
          inPeriod
            .filter((m) => m.direction === 'OUT' && isOperationalKind(m.kind))
            .reduce((s, m) => s + dec(m.amount), 0),
        );
        return {
          id: account.id,
          code: account.code,
          name: account.name,
          kind: account.kind,
          balance,
          inflows,
          outflows,
          result: roundMoney(inflows - outflows),
        };
      }),
    };
  }

  async getAccountBalance(bankAccountId: string): Promise<number> {
    const rows = await this.prisma.cashFlowMovement.findMany({
      where: { bankAccountId, status: 'REALIZED' },
      select: { direction: true, amount: true },
    });
    return roundMoney(
      rows.reduce((sum, m) => sum + netEffect(m.direction, dec(m.amount)), 0),
    );
  }

  async createManual(
    operatorId: string,
    input: {
      direction: 'IN' | 'OUT';
      amount: number;
      occurredAt: string;
      description: string;
      bankAccountId: string;
      categoryId?: string | null;
      costCenterId?: string | null;
      origin?: string;
      notes?: string | null;
      idempotencyKey?: string | null;
      kind?: CashFlowKind;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.cashFlowMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return this.getById(existing.id);
    }

    const amount = roundMoney(input.amount);
    if (amount <= 0) {
      throw new CashFlowValidationError('Valor inválido.', 'INVALID_AMOUNT');
    }
    if (!input.description?.trim()) {
      throw new CashFlowValidationError(
        'Informe a descrição.',
        'DESCRIPTION_REQUIRED',
      );
    }
    if (input.direction !== 'IN' && input.direction !== 'OUT') {
      throw new CashFlowValidationError(
        'Direção inválida.',
        'INVALID_DIRECTION',
      );
    }

    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: input.bankAccountId, active: true },
      select: { id: true },
    });
    if (!bankAccount) {
      throw new CashFlowValidationError(
        'Conta bancária inválida ou inativa.',
        'INVALID_BANK_ACCOUNT',
      );
    }

    const kind = (input.kind ?? 'MANUAL') satisfies CashFlowKind;

    const created = await this.prisma.$transaction(async (tx) => {
      const movement = await tx.cashFlowMovement.create({
        data: {
          direction: input.direction,
          kind,
          status: 'REALIZED',
          amount,
          occurredAt: toUtcDateOnly(input.occurredAt),
          description: input.description.trim(),
          bankAccountId: bankAccount.id,
          categoryId: input.categoryId || null,
          costCenterId: input.costCenterId || null,
          origin: (input.origin as CashFlowOrigin) || 'MANUAL',
          notes: input.notes?.trim() || null,
          operatorId,
          idempotencyKey: input.idempotencyKey || null,
        },
      });
      await tx.cashFlowAuditLog.create({
        data: {
          movementId: movement.id,
          actorId: operatorId,
          action: kind === 'ADJUSTMENT' ? 'ADJUST_BALANCE' : 'CREATE_MANUAL',
          amount,
          message:
            kind === 'ADJUSTMENT'
              ? 'Ajuste de saldo.'
              : 'Movimentação manual criada.',
        },
      });
      return movement.id;
    });

    return this.getById(created);
  }

  async createTransfer(
    operatorId: string,
    input: {
      amount: number;
      occurredAt: string;
      fromBankAccountId: string;
      toBankAccountId: string;
      description?: string | null;
      notes?: string | null;
      idempotencyKey?: string | null;
      allowNegative?: boolean;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.cashFlowMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return this.getById(existing.id);
    }

    const amount = roundMoney(input.amount);
    if (amount <= 0) {
      throw new CashFlowValidationError('Valor inválido.', 'INVALID_AMOUNT');
    }
    if (input.fromBankAccountId === input.toBankAccountId) {
      throw new CashFlowValidationError(
        'Contas de origem e destino devem ser diferentes.',
        'SAME_ACCOUNT',
      );
    }

    const [fromAcc, toAcc] = await Promise.all([
      this.prisma.bankAccount.findFirst({
        where: { id: input.fromBankAccountId, active: true },
      }),
      this.prisma.bankAccount.findFirst({
        where: { id: input.toBankAccountId, active: true },
      }),
    ]);
    if (!fromAcc || !toAcc) {
      throw new CashFlowValidationError(
        'Conta bancária inválida.',
        'INVALID_BANK_ACCOUNT',
      );
    }

    const balance = await this.getAccountBalance(fromAcc.id);
    if (!input.allowNegative && amount > balance + 0.0001) {
      throw new CashFlowValidationError(
        'Saldo insuficiente na conta de origem.',
        'INSUFFICIENT_BALANCE',
      );
    }

    const transferGroupId = randomUUID();
    const occurredAt = toUtcDateOnly(input.occurredAt);
    const description =
      input.description?.trim() ||
      `Transferência ${fromAcc.code} → ${toAcc.code}`;

    const outId = await this.prisma.$transaction(async (tx) => {
      const out = await tx.cashFlowMovement.create({
        data: {
          direction: 'OUT',
          kind: 'TRANSFER',
          status: 'REALIZED',
          amount,
          occurredAt,
          description,
          bankAccountId: fromAcc.id,
          origin: 'TRANSFER',
          transferGroupId,
          notes: input.notes?.trim() || null,
          operatorId,
          idempotencyKey: input.idempotencyKey || null,
        },
      });
      const inn = await tx.cashFlowMovement.create({
        data: {
          direction: 'IN',
          kind: 'TRANSFER',
          status: 'REALIZED',
          amount,
          occurredAt,
          description,
          bankAccountId: toAcc.id,
          origin: 'TRANSFER',
          transferGroupId,
          notes: input.notes?.trim() || null,
          operatorId,
        },
      });
      await tx.cashFlowAuditLog.createMany({
        data: [
          {
            movementId: out.id,
            actorId: operatorId,
            action: 'TRANSFER_OUT',
            amount,
            message: description,
          },
          {
            movementId: inn.id,
            actorId: operatorId,
            action: 'TRANSFER_IN',
            amount,
            message: description,
          },
        ],
      });
      return out.id;
    });

    return this.getById(outId);
  }

  async adjustBalance(
    operatorId: string,
    input: {
      bankAccountId: string;
      targetBalance?: number;
      difference?: number;
      reason: string;
      occurredAt: string;
      notes?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    if (!input.reason?.trim()) {
      throw new CashFlowValidationError(
        'Informe o motivo do ajuste.',
        'REASON_REQUIRED',
      );
    }

    const bankAccount = await this.prisma.bankAccount.findFirst({
      where: { id: input.bankAccountId, active: true },
      select: { id: true },
    });
    if (!bankAccount) {
      throw new CashFlowValidationError(
        'Conta bancária inválida ou inativa.',
        'INVALID_BANK_ACCOUNT',
      );
    }

    const currentBalance = await this.getAccountBalance(bankAccount.id);
    let difference: number;
    if (input.difference != null && Number.isFinite(input.difference)) {
      difference = roundMoney(input.difference);
    } else if (
      input.targetBalance != null &&
      Number.isFinite(input.targetBalance)
    ) {
      difference = roundMoney(input.targetBalance - currentBalance);
    } else {
      throw new CashFlowValidationError(
        'Informe o saldo alvo ou a diferença.',
        'ADJUST_VALUE_REQUIRED',
      );
    }

    if (Math.abs(difference) < 0.0001) {
      throw new CashFlowValidationError(
        'Diferença de ajuste é zero.',
        'ZERO_ADJUSTMENT',
      );
    }

    const direction: 'IN' | 'OUT' = difference > 0 ? 'IN' : 'OUT';
    const amount = roundMoney(Math.abs(difference));

    return this.createManual(operatorId, {
      direction,
      amount,
      occurredAt: input.occurredAt,
      description: `Ajuste de saldo: ${input.reason.trim()}`,
      bankAccountId: bankAccount.id,
      notes: input.notes?.trim() || null,
      idempotencyKey: input.idempotencyKey || null,
      kind: 'ADJUSTMENT',
      origin: 'MANUAL',
    });
  }

  async cancelMovement(operatorId: string, id: string, reason: string) {
    if (!reason?.trim()) {
      throw new CashFlowValidationError(
        'Informe o motivo do cancelamento.',
        'REASON_REQUIRED',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const row = await this.ledger.assertMovementRealized(tx, id);
      if (row.kind === 'TRANSFER' && row.transferGroupId) {
        await tx.cashFlowMovement.updateMany({
          where: {
            transferGroupId: row.transferGroupId,
            status: 'REALIZED',
          },
          data: { status: 'CANCELLED' },
        });
      } else {
        await tx.cashFlowMovement.update({
          where: { id },
          data: { status: 'CANCELLED' },
        });
      }
      await tx.cashFlowAuditLog.create({
        data: {
          movementId: id,
          actorId: operatorId,
          action: 'CANCEL',
          amount: dec(row.amount),
          message: reason.trim(),
        },
      });
    });

    return this.getById(id);
  }

  async reverseMovement(operatorId: string, id: string, reason: string) {
    if (!reason?.trim()) {
      throw new CashFlowValidationError(
        'Informe o motivo do estorno.',
        'REASON_REQUIRED',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const row = await this.ledger.assertMovementRealized(tx, id);
      if (row.kind === 'TRANSFER' && row.transferGroupId) {
        await tx.cashFlowMovement.updateMany({
          where: {
            transferGroupId: row.transferGroupId,
            status: 'REALIZED',
          },
          data: { status: 'REVERSED' },
        });
      } else {
        await tx.cashFlowMovement.update({
          where: { id },
          data: { status: 'REVERSED' },
        });
      }
      await tx.cashFlowAuditLog.create({
        data: {
          movementId: id,
          actorId: operatorId,
          action: 'REVERSE',
          amount: dec(row.amount),
          message: reason.trim(),
        },
      });
    });

    return this.getById(id);
  }

  resolvePeriod(filters: CashFlowPeriodFilters): { from: Date; to: Date } {
    const today = toUtcDateOnly(new Date());
    if (filters.period === 'CUSTOM' || filters.from || filters.to) {
      const from = filters.from ? toUtcDateOnly(filters.from) : today;
      const to = filters.to ? toUtcDateOnly(filters.to) : today;
      if (to < from) {
        throw new CashFlowValidationError(
          'Período inválido.',
          'INVALID_PERIOD',
        );
      }
      return { from, to };
    }

    switch (filters.period) {
      case 'TODAY':
        return { from: today, to: today };
      case 'LAST_7':
        return { from: addDays(today, -6), to: today };
      case 'NEXT_7':
        return { from: today, to: addDays(today, 6) };
      case 'MONTH': {
        const from = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
        );
        const to = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
        );
        return { from, to };
      }
      case 'PREV_MONTH': {
        const from = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
        );
        const to = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0),
        );
        return { from, to };
      }
      case 'NEXT_MONTH': {
        const from = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
        );
        const to = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0),
        );
        return { from, to };
      }
      case 'YEAR': {
        const from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        const to = new Date(Date.UTC(today.getUTCFullYear(), 11, 31));
        return { from, to };
      }
      default: {
        const from = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
        );
        const to = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
        );
        return { from, to };
      }
    }
  }

  private previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
    const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1;
    const prevTo = addDays(from, -1);
    const prevFrom = addDays(prevTo, -(days - 1));
    return { from: prevFrom, to: prevTo };
  }

  private accountWhere(
    filters: CashFlowPeriodFilters,
  ): Prisma.CashFlowMovementWhereInput {
    return filters.bankAccountId
      ? { bankAccountId: filters.bankAccountId }
      : {};
  }

  private statusList(status?: string): CashFlowStatus[] | undefined {
    if (!status || status === 'ALL') return undefined;
    if (
      status === 'REALIZED' ||
      status === 'REVERSED' ||
      status === 'CANCELLED'
    ) {
      return [status];
    }
    return undefined;
  }

  private movementWhere(
    filters: CashFlowPeriodFilters,
    from: Date,
    to: Date,
  ): Prisma.CashFlowMovementWhereInput {
    const and: Prisma.CashFlowMovementWhereInput[] = [
      { occurredAt: { gte: from, lte: to } },
    ];
    if (filters.bankAccountId)
      and.push({ bankAccountId: filters.bankAccountId });
    if (filters.categoryId) and.push({ categoryId: filters.categoryId });
    if (filters.costCenterId) and.push({ costCenterId: filters.costCenterId });
    if (filters.direction === 'IN' || filters.direction === 'OUT') {
      and.push({ direction: filters.direction });
    }
    if (filters.origin && filters.origin !== 'ALL') {
      and.push({ origin: filters.origin as CashFlowOrigin });
    }
    if (filters.kind && filters.kind !== 'ALL') {
      and.push({ kind: filters.kind as CashFlowKind });
    }
    const statuses = this.statusList(filters.status);
    if (statuses) and.push({ status: { in: statuses } });
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      and.push({
        OR: [
          { description: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { originRef: { contains: q, mode: 'insensitive' } },
        ],
      });
    }
    return { AND: and };
  }

  private bucketKey(date: Date, groupBy: 'day' | 'week' | 'month'): string {
    if (groupBy === 'month') {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`;
    }
    if (groupBy === 'week') {
      const day = date.getUTCDay() || 7;
      const monday = addDays(date, -(day - 1));
      return isoDate(monday);
    }
    return isoDate(date);
  }

  private async loadProjectionItems(
    bankAccountId: string | undefined,
    from: Date,
    to: Date,
  ) {
    const arWhere: Prisma.AccountReceivableWhereInput = {
      status: { in: ['OPEN', 'PARTIAL'] },
      dueDate: { gte: from, lte: to },
      ...(bankAccountId ? { bankAccountId } : {}),
    };
    const apWhere: Prisma.AccountPayableWhereInput = {
      status: { in: ['OPEN', 'PARTIAL'] },
      dueDate: { gte: from, lte: to },
      ...(bankAccountId ? { bankAccountId } : {}),
    };

    const [receivables, payables] = await Promise.all([
      this.prisma.accountReceivable.findMany({
        where: arWhere,
        select: {
          id: true,
          description: true,
          dueDate: true,
          originalAmount: true,
          discountAmount: true,
          interestAmount: true,
          fineAmount: true,
          paidAmount: true,
        },
      }),
      this.prisma.accountPayable.findMany({
        where: apWhere,
        select: {
          id: true,
          description: true,
          dueDate: true,
          originalAmount: true,
          discountAmount: true,
          interestAmount: true,
          fineAmount: true,
          paidAmount: true,
        },
      }),
    ]);

    const items: Array<{
      date: Date;
      direction: CashFlowDirection;
      amount: number;
      description: string;
      origin: 'RECEIVABLE' | 'PAYABLE';
      originId: string;
    }> = [];

    for (const r of receivables) {
      const updated = roundMoney(
        dec(r.originalAmount) +
          dec(r.interestAmount) +
          dec(r.fineAmount) -
          dec(r.discountAmount),
      );
      const balance = roundMoney(Math.max(0, updated - dec(r.paidAmount)));
      if (balance <= 0.0001) continue;
      items.push({
        date: toUtcDateOnly(r.dueDate),
        direction: 'IN',
        amount: balance,
        description: r.description,
        origin: 'RECEIVABLE',
        originId: r.id,
      });
    }

    for (const p of payables) {
      const updated = roundMoney(
        dec(p.originalAmount) +
          dec(p.interestAmount) +
          dec(p.fineAmount) -
          dec(p.discountAmount),
      );
      const balance = roundMoney(Math.max(0, updated - dec(p.paidAmount)));
      if (balance <= 0.0001) continue;
      items.push({
        date: toUtcDateOnly(p.dueDate),
        direction: 'OUT',
        amount: balance,
        description: p.description,
        origin: 'PAYABLE',
        originId: p.id,
      });
    }

    return items;
  }

  private mapListItem(
    m: {
      id: string;
      sequentialId: number;
      direction: CashFlowDirection;
      kind: CashFlowKind;
      status: CashFlowStatus;
      amount: unknown;
      occurredAt: Date;
      description: string;
      origin: CashFlowOrigin;
      originRef: string | null;
      transferGroupId: string | null;
      notes: string | null;
      bankAccount: { id: string; code: string; name: string; kind: string };
      category: { id: string; code: string; name: string } | null;
      costCenter: { id: string; code: string; name: string } | null;
      operator: { id: string; name: string };
    },
    runningBalance: number | null,
  ) {
    return {
      id: m.id,
      sequentialId: m.sequentialId,
      number: `CF-${String(m.sequentialId).padStart(6, '0')}`,
      direction: m.direction,
      kind: m.kind,
      status: m.status,
      amount: dec(m.amount),
      occurredAt: isoDate(m.occurredAt),
      description: m.description,
      origin: m.origin,
      originRef: m.originRef,
      transferGroupId: m.transferGroupId,
      notes: m.notes,
      bankAccount: m.bankAccount,
      category: m.category,
      costCenter: m.costCenter,
      operatorName: m.operator.name,
      runningBalance,
    };
  }

  private mapDetail(
    m: Prisma.CashFlowMovementGetPayload<{ include: typeof movementInclude }>,
  ) {
    return {
      ...this.mapListItem(m, null),
      operator: m.operator,
      auditLogs: m.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        amount: a.amount == null ? null : dec(a.amount),
        message: a.message,
        createdAt: a.createdAt.toISOString(),
        actorName: a.actor.name,
      })),
      receivableMovementId: m.receivableMovementId,
      payableMovementId: m.payableMovementId,
      reversesMovementId: m.reversesMovementId,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }
}
