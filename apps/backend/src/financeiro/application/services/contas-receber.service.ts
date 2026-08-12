import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  ReceivableOrigin,
  ReceivableStatus,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  ReceivableNotFoundError,
  ReceivablePermissionError,
  ReceivableValidationError,
} from '../../domain/receivable/errors';
import {
  calculateLateCharges,
  calculateReceivableMoney,
  daysOverdue,
  resolveDisplayStatus,
  resolvePersistedStatus,
  toUtcDateOnly,
} from '../../domain/receivable/receivable-money';
import { CashFlowLedgerService } from './cash-flow-ledger.service';
import { CollectionSyncService } from './collection-sync.service';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

const detailInclude = {
  customer: true,
  paymentMethod: true,
  bankAccount: true,
  costCenter: true,
  createdBy: { select: { id: true, name: true, email: true } },
  installments: { orderBy: { number: 'asc' as const } },
  movements: {
    include: {
      paymentMethod: true,
      bankAccount: true,
      operator: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' as const },
  },
  auditLogs: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
} satisfies Prisma.AccountReceivableInclude;

export type ListReceivablesFilters = {
  search?: string;
  status?: string;
  customerId?: string;
  paymentMethodId?: string;
  bankAccountId?: string;
  costCenterId?: string;
  origin?: string;
  period?: string;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
};

@Injectable()
export class ContasReceberService {
  /** Limite de desconto do operador (%) — preparado para RBAC. */
  private readonly operatorDiscountLimitPercent = 10;
  private readonly canApplyDiscount = true;
  private readonly canReverse = true;
  private readonly canRenegotiate = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly collectionSync: CollectionSyncService,
    private readonly cashFlowLedger: CashFlowLedgerService,
  ) {}

  async getLookups() {
    const [paymentMethods, bankAccounts, costCenters] = await Promise.all([
      this.prisma.financePaymentMethod.findMany({
        where: { active: true },
        orderBy: { label: 'asc' },
      }),
      this.prisma.bankAccount.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.costCenter.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      paymentMethods: paymentMethods.map((m) => ({
        id: m.id,
        code: m.code,
        label: m.label,
      })),
      bankAccounts: bankAccounts.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        bankName: a.bankName,
      })),
      costCenters: costCenters.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      })),
      operatorDiscountLimitPercent: this.operatorDiscountLimitPercent,
    };
  }

  async searchCustomers(search?: string, page = 1, pageSize = 20) {
    const q = search?.trim();
    const where: Prisma.CustomerWhereInput = {
      active: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
              { document: { contains: q } },
            ],
          }
        : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        documentType: c.documentType,
        document: c.document,
        phone: c.phone,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async dashboard(filters: ListReceivablesFilters) {
    const { dueFrom, dueTo } = this.resolvePeriod(filters);
    const openStatuses: ReceivableStatus[] = ['OPEN', 'PARTIAL'];
    const today = toUtcDateOnly(new Date());
    const todayEnd = new Date(today);
    todayEnd.setUTCHours(23, 59, 59, 999);

    const openRows = await this.prisma.accountReceivable.findMany({
      where: { status: { in: openStatuses } },
      select: {
        originalAmount: true,
        discountAmount: true,
        interestAmount: true,
        fineAmount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
      },
    });

    let totalOpen = 0;
    let dueToday = 0;
    let overdue = 0;
    for (const row of openRows) {
      const money = this.moneyForRow(row);
      totalOpen += money.balance;
      const display = resolveDisplayStatus({
        status: row.status,
        dueDate: row.dueDate,
        balance: money.balance,
        today,
      });
      if (display === 'DUE_TODAY') dueToday += money.balance;
      if (display === 'OVERDUE') overdue += money.balance;
    }

    const receiptWhere: Prisma.ReceivableMovementWhereInput = {
      type: 'RECEIPT',
      ...(dueFrom || dueTo
        ? {
            paidAt: {
              ...(dueFrom ? { gte: dueFrom } : {}),
              ...(dueTo ? { lte: dueTo } : {}),
            },
          }
        : {}),
    };
    const receivedAgg = await this.prisma.receivableMovement.aggregate({
      where: receiptWhere,
      _sum: { amount: true },
    });

    const expectedRows = await this.prisma.accountReceivable.findMany({
      where: {
        status: { in: openStatuses },
        ...(dueFrom || dueTo
          ? {
              dueDate: {
                ...(dueFrom ? { gte: dueFrom } : {}),
                ...(dueTo ? { lte: dueTo } : {}),
              },
            }
          : {}),
      },
      select: {
        originalAmount: true,
        discountAmount: true,
        interestAmount: true,
        fineAmount: true,
        paidAmount: true,
        dueDate: true,
        status: true,
      },
    });
    const expectedInPeriod = expectedRows.reduce(
      (sum, row) => sum + this.moneyForRow(row).balance,
      0,
    );

    return {
      totalOpen: round(totalOpen),
      dueToday: round(dueToday),
      overdue: round(overdue),
      receivedInPeriod: round(dec(receivedAgg._sum.amount)),
      expectedInPeriod: round(expectedInPeriod),
    };
  }

  async list(filters: ListReceivablesFilters) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 20, 100);
    const where = this.buildWhere(filters);
    const sortBy = [
      'dueDate',
      'sequentialId',
      'originalAmount',
      'createdAt',
    ].includes(filters.sortBy ?? '')
      ? (filters.sortBy as string)
      : 'dueDate';
    const sortDir = filters.sortDir === 'desc' ? 'desc' : 'asc';

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.accountReceivable.count({ where }),
      this.prisma.accountReceivable.findMany({
        where,
        include: {
          customer: true,
          paymentMethod: true,
          installments: { orderBy: { number: 'asc' } },
        },
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const today = new Date();
    const items = rows
      .map((row) => this.toListItem(row, today))
      .filter((item) =>
        this.matchesDisplayStatus(item.displayStatus, filters.status),
      );

    // When filtering by derived status, recount via full scan of matching base where
    let filteredTotal = total;
    if (
      filters.status &&
      filters.status !== 'ALL' &&
      this.isDerivedStatus(filters.status)
    ) {
      const all = await this.prisma.accountReceivable.findMany({
        where: this.buildWhere({ ...filters, status: 'ALL' }),
        include: { customer: true, paymentMethod: true, installments: true },
      });
      const mapped = all
        .map((row) => this.toListItem(row, today))
        .filter((item) =>
          this.matchesDisplayStatus(item.displayStatus, filters.status),
        );
      filteredTotal = mapped.length;
      const slice = mapped.slice((page - 1) * pageSize, page * pageSize);
      return {
        items: slice,
        total: filteredTotal,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
      };
    }

    return {
      items,
      total: filteredTotal,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(filteredTotal / pageSize)),
    };
  }

  async getById(id: string) {
    const row = await this.prisma.accountReceivable.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!row) throw new ReceivableNotFoundError();
    await this.ensureLateCharges(row.id);
    const refreshed = await this.prisma.accountReceivable.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!refreshed) throw new ReceivableNotFoundError();
    return this.toDetail(refreshed);
  }

  async create(
    operatorId: string,
    input: {
      customerId: string;
      description: string;
      document?: string | null;
      originalAmount: number;
      issueDate: string;
      dueDate: string;
      origin?: ReceivableOrigin;
      originRef?: string | null;
      paymentMethodId?: string | null;
      bankAccountId?: string | null;
      costCenterId?: string | null;
      installmentCount?: number;
      notes?: string | null;
    },
  ) {
    if (!input.description?.trim()) {
      throw new ReceivableValidationError(
        'Informe a descrição.',
        'INVALID_DESCRIPTION',
      );
    }
    if (!Number.isFinite(input.originalAmount) || input.originalAmount <= 0) {
      throw new ReceivableValidationError(
        'Valor deve ser maior que zero.',
        'INVALID_AMOUNT',
      );
    }
    const customer = await this.prisma.customer.findFirst({
      where: { id: input.customerId, active: true },
    });
    if (!customer) {
      throw new ReceivableValidationError(
        'Cliente inválido.',
        'INVALID_CUSTOMER',
      );
    }
    const issueDate = toUtcDateOnly(input.issueDate);
    const dueDate = toUtcDateOnly(input.dueDate);
    if (dueDate.getTime() < issueDate.getTime()) {
      throw new ReceivableValidationError(
        'Vencimento não pode ser anterior à emissão.',
        'INVALID_DATES',
      );
    }
    const installmentCount = Math.max(
      1,
      Math.min(input.installmentCount ?? 1, 60),
    );
    const installmentAmount = round(input.originalAmount / installmentCount);

    const created = await this.prisma.$transaction(async (tx) => {
      const receivable = await tx.accountReceivable.create({
        data: {
          customerId: customer.id,
          origin: input.origin ?? 'MANUAL',
          originRef: input.originRef ?? null,
          description: input.description.trim(),
          document: input.document?.trim() || null,
          issueDate,
          dueDate,
          originalAmount: input.originalAmount,
          paymentMethodId: input.paymentMethodId || null,
          bankAccountId: input.bankAccountId || null,
          costCenterId: input.costCenterId || null,
          installmentCount,
          notes: input.notes?.trim() || null,
          createdById: operatorId,
          status: 'OPEN',
        },
      });

      for (let i = 1; i <= installmentCount; i++) {
        const instDue = new Date(issueDate);
        instDue.setUTCMonth(instDue.getUTCMonth() + (i - 1));
        if (installmentCount === 1) {
          instDue.setTime(dueDate.getTime());
        } else if (i === installmentCount) {
          // last installment uses informed dueDate as base + months
        }
        const amount =
          i === installmentCount
            ? round(
                input.originalAmount -
                  installmentAmount * (installmentCount - 1),
              )
            : installmentAmount;
        await tx.receivableInstallment.create({
          data: {
            receivableId: receivable.id,
            number: i,
            dueDate: installmentCount === 1 ? dueDate : toUtcDateOnly(instDue),
            amount,
            status: 'OPEN',
          },
        });
      }

      await tx.receivableAuditLog.create({
        data: {
          receivableId: receivable.id,
          actorId: operatorId,
          action: 'CREATE',
          amount: input.originalAmount,
          message: 'Conta a receber criada.',
        },
      });

      return receivable.id;
    });

    return this.getById(created);
  }

  async registerReceipt(
    operatorId: string,
    receivableId: string,
    input: {
      amount: number;
      paidAt: string;
      paymentMethodId?: string | null;
      bankAccountId?: string | null;
      installmentId?: string | null;
      interestAmount?: number;
      fineAmount?: number;
      discountAmount?: number;
      notes?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    if (input.idempotencyKey) {
      const existing = await this.prisma.receivableMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return this.getById(existing.receivableId);
    }

    await this.ensureLateCharges(receivableId);
    const row = await this.prisma.accountReceivable.findUnique({
      where: { id: receivableId },
      include: { installments: true },
    });
    if (!row) throw new ReceivableNotFoundError();
    if (
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED' ||
      row.status === 'SETTLED'
    ) {
      throw new ReceivableValidationError(
        'Conta não permite recebimento neste status.',
        'INVALID_STATUS',
      );
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ReceivableValidationError(
        'Valor recebido inválido.',
        'INVALID_AMOUNT',
      );
    }

    const discountAmount = input.discountAmount ?? 0;
    if (discountAmount > 0) {
      if (!this.canApplyDiscount) {
        throw new ReceivablePermissionError(
          'Sem permissão para aplicar desconto.',
        );
      }
      const money = this.moneyForRow(row);
      const percent = (discountAmount / money.updatedAmount) * 100;
      if (percent > this.operatorDiscountLimitPercent + 0.0001) {
        throw new ReceivableValidationError(
          `Desconto acima do limite do operador (${this.operatorDiscountLimitPercent}%).`,
          'DISCOUNT_LIMIT',
        );
      }
    }

    const interestAmount = input.interestAmount ?? 0;
    const fineAmount = input.fineAmount ?? 0;
    const working = {
      ...row,
      discountAmount: dec(row.discountAmount) + discountAmount,
      interestAmount: Math.max(
        dec(row.interestAmount),
        interestAmount || dec(row.interestAmount),
      ),
      fineAmount: Math.max(
        dec(row.fineAmount),
        fineAmount || dec(row.fineAmount),
      ),
    };
    const money = this.moneyForRow(working);
    if (input.amount > money.balance + 0.0001) {
      throw new ReceivableValidationError(
        'Valor recebido maior que o saldo da conta.',
        'AMOUNT_EXCEEDS_BALANCE',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const receiptMovement = await tx.receivableMovement.create({
        data: {
          receivableId,
          installmentId: input.installmentId || null,
          type: 'RECEIPT',
          amount: input.amount,
          paidAt: toUtcDateOnly(input.paidAt),
          paymentMethodId: input.paymentMethodId || null,
          bankAccountId: input.bankAccountId || null,
          interestAmount,
          fineAmount,
          discountAmount,
          notes: input.notes?.trim() || null,
          operatorId,
          idempotencyKey: input.idempotencyKey || null,
        },
      });

      await this.cashFlowLedger.recordFromReceivableReceipt(tx, {
        receivableMovementId: receiptMovement.id,
        amount: input.amount,
        occurredAt: input.paidAt,
        description: row.description,
        bankAccountId: input.bankAccountId || row.bankAccountId,
        costCenterId: row.costCenterId,
        operatorId,
        originRef: row.document || receivableId,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey
          ? `cf:${input.idempotencyKey}`
          : null,
      });

      const newPaid = dec(row.paidAmount) + input.amount;
      const newDiscount = dec(row.discountAmount) + discountAmount;
      const newInterest = Math.max(
        dec(row.interestAmount),
        interestAmount || dec(row.interestAmount),
      );
      const newFine = Math.max(
        dec(row.fineAmount),
        fineAmount || dec(row.fineAmount),
      );
      const nextMoney = calculateReceivableMoney({
        originalAmount: dec(row.originalAmount),
        discountAmount: newDiscount,
        interestAmount: newInterest,
        fineAmount: newFine,
        paidAmount: newPaid,
      });
      const status = resolvePersistedStatus(nextMoney.balance, newPaid);

      await tx.accountReceivable.update({
        where: { id: receivableId },
        data: {
          paidAmount: newPaid,
          discountAmount: newDiscount,
          interestAmount: newInterest,
          fineAmount: newFine,
          status,
        },
      });

      if (input.installmentId) {
        const inst = row.installments.find((i) => i.id === input.installmentId);
        if (inst) {
          const instPaid = dec(inst.paidAmount) + input.amount;
          const instBalance = Math.max(0, dec(inst.amount) - instPaid);
          await tx.receivableInstallment.update({
            where: { id: inst.id },
            data: {
              paidAmount: instPaid,
              status: resolvePersistedStatus(instBalance, instPaid),
            },
          });
        }
      } else if (row.installments.length === 1) {
        const inst = row.installments[0];
        const instPaid = dec(inst.paidAmount) + input.amount;
        const instBalance = Math.max(0, dec(inst.amount) - instPaid);
        await tx.receivableInstallment.update({
          where: { id: inst.id },
          data: {
            paidAmount: instPaid,
            status: resolvePersistedStatus(instBalance, instPaid),
          },
        });
      }

      await tx.receivableAuditLog.create({
        data: {
          receivableId,
          actorId: operatorId,
          action: 'RECEIPT',
          amount: input.amount,
          message:
            status === 'SETTLED'
              ? 'Recebimento integral.'
              : 'Recebimento parcial.',
        },
      });
    });

    const detail = await this.getById(receivableId);
    await this.collectionSync.syncCaseByReceivableId(receivableId);
    return detail;
  }

  async reverseReceipt(
    operatorId: string,
    receivableId: string,
    movementId: string,
    reason: string,
  ) {
    if (!this.canReverse) {
      throw new ReceivablePermissionError('Sem permissão para estornar.');
    }
    if (!reason?.trim()) {
      throw new ReceivableValidationError(
        'Informe o motivo do estorno.',
        'REASON_REQUIRED',
      );
    }
    const movement = await this.prisma.receivableMovement.findFirst({
      where: { id: movementId, receivableId, type: 'RECEIPT' },
    });
    if (!movement) {
      throw new ReceivableNotFoundError('Recebimento não encontrado.');
    }
    const already = await this.prisma.receivableMovement.findFirst({
      where: { reversesMovementId: movementId, type: 'REVERSAL' },
    });
    if (already) {
      throw new ReceivableValidationError(
        'Recebimento já estornado.',
        'ALREADY_REVERSED',
      );
    }

    const row = await this.prisma.accountReceivable.findUnique({
      where: { id: receivableId },
      include: { installments: true },
    });
    if (!row) throw new ReceivableNotFoundError();

    await this.prisma.$transaction(async (tx) => {
      await tx.receivableMovement.create({
        data: {
          receivableId,
          installmentId: movement.installmentId,
          type: 'REVERSAL',
          amount: movement.amount,
          paidAt: toUtcDateOnly(new Date()),
          paymentMethodId: movement.paymentMethodId,
          bankAccountId: movement.bankAccountId,
          notes: reason.trim(),
          operatorId,
          reversesMovementId: movement.id,
        },
      });

      await this.cashFlowLedger.reverseLinkedMovement(tx, {
        receivableMovementId: movement.id,
        operatorId,
        reason: reason.trim(),
      });

      const newPaid = Math.max(0, dec(row.paidAmount) - dec(movement.amount));
      const nextMoney = calculateReceivableMoney({
        originalAmount: dec(row.originalAmount),
        discountAmount: dec(row.discountAmount),
        interestAmount: dec(row.interestAmount),
        fineAmount: dec(row.fineAmount),
        paidAmount: newPaid,
      });
      const status =
        row.status === 'RENEGOTIATED' || row.status === 'CANCELLED'
          ? row.status
          : resolvePersistedStatus(nextMoney.balance, newPaid);

      await tx.accountReceivable.update({
        where: { id: receivableId },
        data: { paidAmount: newPaid, status },
      });

      if (movement.installmentId) {
        const inst = row.installments.find(
          (i) => i.id === movement.installmentId,
        );
        if (inst) {
          const instPaid = Math.max(
            0,
            dec(inst.paidAmount) - dec(movement.amount),
          );
          const instBalance = Math.max(0, dec(inst.amount) - instPaid);
          await tx.receivableInstallment.update({
            where: { id: inst.id },
            data: {
              paidAmount: instPaid,
              status: resolvePersistedStatus(instBalance, instPaid),
            },
          });
        }
      }

      await tx.receivableAuditLog.create({
        data: {
          receivableId,
          actorId: operatorId,
          action: 'REVERSAL',
          amount: dec(movement.amount),
          message: reason.trim(),
        },
      });
    });

    const detail = await this.getById(receivableId);
    await this.collectionSync.syncCaseByReceivableId(receivableId);
    return detail;
  }

  async renegotiate(
    operatorId: string,
    receivableId: string,
    input: {
      installmentCount: number;
      firstDueDate: string;
      interestAmount?: number;
      discountAmount?: number;
      notes?: string | null;
    },
  ) {
    if (!this.canRenegotiate) {
      throw new ReceivablePermissionError('Sem permissão para renegociar.');
    }
    const row = await this.prisma.accountReceivable.findUnique({
      where: { id: receivableId },
    });
    if (!row) throw new ReceivableNotFoundError();
    if (
      row.status === 'SETTLED' ||
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED'
    ) {
      throw new ReceivableValidationError(
        'Conta não permite renegociação.',
        'INVALID_STATUS',
      );
    }
    const money = this.moneyForRow(row);
    if (money.balance <= 0) {
      throw new ReceivableValidationError(
        'Sem saldo para renegociar.',
        'NO_BALANCE',
      );
    }
    const count = Math.max(1, Math.min(input.installmentCount, 60));
    const interest = input.interestAmount ?? 0;
    const discount = input.discountAmount ?? 0;
    const newAmount = round(
      Math.max(0.01, money.balance + interest - discount),
    );

    const newId = await this.prisma.$transaction(async (tx) => {
      await tx.accountReceivable.update({
        where: { id: receivableId },
        data: { status: 'RENEGOTIATED' },
      });
      const created = await tx.accountReceivable.create({
        data: {
          customerId: row.customerId,
          origin: 'OTHER',
          originRef: `RENEG-${row.sequentialId}`,
          description: `Renegociação da conta #${row.sequentialId}`,
          document: row.document,
          issueDate: toUtcDateOnly(new Date()),
          dueDate: toUtcDateOnly(input.firstDueDate),
          originalAmount: newAmount,
          interestAmount: interest,
          discountAmount: discount,
          installmentCount: count,
          notes: input.notes?.trim() || null,
          createdById: operatorId,
          renegotiatedFromId: receivableId,
          paymentMethodId: row.paymentMethodId,
          bankAccountId: row.bankAccountId,
          costCenterId: row.costCenterId,
          status: 'OPEN',
        },
      });
      const installmentAmount = round(newAmount / count);
      for (let i = 1; i <= count; i++) {
        const due = toUtcDateOnly(input.firstDueDate);
        due.setUTCMonth(due.getUTCMonth() + (i - 1));
        const amount =
          i === count
            ? round(newAmount - installmentAmount * (count - 1))
            : installmentAmount;
        await tx.receivableInstallment.create({
          data: {
            receivableId: created.id,
            number: i,
            dueDate: due,
            amount,
            status: 'OPEN',
          },
        });
      }
      await tx.receivableAuditLog.create({
        data: {
          receivableId,
          actorId: operatorId,
          action: 'RENEGOTIATE',
          amount: newAmount,
          message: `Renegociada na conta #${created.sequentialId}`,
        },
      });
      await tx.receivableAuditLog.create({
        data: {
          receivableId: created.id,
          actorId: operatorId,
          action: 'CREATE',
          amount: newAmount,
          message: `Originada da renegociação #${row.sequentialId}`,
        },
      });
      return created.id;
    });

    const detail = await this.getById(newId);
    await this.collectionSync.syncCaseByReceivableId(receivableId);
    await this.collectionSync.syncCaseByReceivableId(newId);
    return detail;
  }

  async cancel(operatorId: string, receivableId: string, reason: string) {
    if (!reason?.trim()) {
      throw new ReceivableValidationError(
        'Informe o motivo.',
        'REASON_REQUIRED',
      );
    }
    const row = await this.prisma.accountReceivable.findUnique({
      where: { id: receivableId },
    });
    if (!row) throw new ReceivableNotFoundError();
    if (row.status === 'SETTLED' || row.status === 'CANCELLED') {
      throw new ReceivableValidationError(
        'Conta não pode ser cancelada.',
        'INVALID_STATUS',
      );
    }
    await this.prisma.$transaction([
      this.prisma.accountReceivable.update({
        where: { id: receivableId },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.receivableAuditLog.create({
        data: {
          receivableId,
          actorId: operatorId,
          action: 'CANCEL',
          message: reason.trim(),
        },
      }),
    ]);
    const detail = await this.getById(receivableId);
    await this.collectionSync.syncCaseByReceivableId(receivableId);
    return detail;
  }

  private async ensureLateCharges(id: string) {
    const row = await this.prisma.accountReceivable.findUnique({
      where: { id },
    });
    if (!row) return;
    if (row.status !== 'OPEN' && row.status !== 'PARTIAL') return;
    const days = daysOverdue(row.dueDate);
    if (days <= 0) return;
    const charges = calculateLateCharges({
      originalAmount: dec(row.originalAmount),
      discountAmount: dec(row.discountAmount),
      daysLate: days,
    });
    if (
      charges.fineAmount <= dec(row.fineAmount) + 0.0001 &&
      charges.interestAmount <= dec(row.interestAmount) + 0.0001
    ) {
      return;
    }
    await this.prisma.accountReceivable.update({
      where: { id },
      data: {
        fineAmount: Math.max(dec(row.fineAmount), charges.fineAmount),
        interestAmount: Math.max(
          dec(row.interestAmount),
          charges.interestAmount,
        ),
      },
    });
  }

  private moneyForRow(row: {
    originalAmount: unknown;
    discountAmount: unknown;
    interestAmount: unknown;
    fineAmount: unknown;
    paidAmount: unknown;
  }) {
    return calculateReceivableMoney({
      originalAmount: dec(row.originalAmount),
      discountAmount: dec(row.discountAmount),
      interestAmount: dec(row.interestAmount),
      fineAmount: dec(row.fineAmount),
      paidAmount: dec(row.paidAmount),
    });
  }

  private toListItem(
    row: {
      id: string;
      sequentialId: number;
      origin: ReceivableOrigin;
      originRef: string | null;
      description: string;
      document: string | null;
      issueDate: Date;
      dueDate: Date;
      originalAmount: unknown;
      discountAmount: unknown;
      interestAmount: unknown;
      fineAmount: unknown;
      paidAmount: unknown;
      status: ReceivableStatus;
      customer: {
        id: string;
        code: string;
        name: string;
        document: string | null;
        documentType: string | null;
      };
      paymentMethod: { id: string; label: string } | null;
      installments: Array<{ number: number; amount: unknown }>;
    },
    today: Date,
  ) {
    const money = this.moneyForRow(row);
    const displayStatus = resolveDisplayStatus({
      status: row.status,
      dueDate: row.dueDate,
      balance: money.balance,
      today,
    });
    const overdueDays = daysOverdue(row.dueDate, today);
    return {
      id: row.id,
      sequentialId: row.sequentialId,
      number: `CR-${row.sequentialId}`,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        document: row.customer.document,
        documentType: row.customer.documentType,
      },
      document: row.document,
      origin: row.origin,
      originRef: row.originRef,
      description: row.description,
      installmentLabel:
        row.installments.length > 1 ? `1/${row.installments.length}` : `1/1`,
      installmentCount: row.installments.length || 1,
      dueDate: row.dueDate.toISOString().slice(0, 10),
      issueDate: row.issueDate.toISOString().slice(0, 10),
      originalAmount: money.originalAmount,
      discountAmount: money.discountAmount,
      interestAmount: money.interestAmount,
      fineAmount: money.fineAmount,
      updatedAmount: money.updatedAmount,
      paidAmount: money.paidAmount,
      balance: money.balance,
      status: row.status,
      displayStatus,
      overdueDays: displayStatus === 'OVERDUE' ? overdueDays : 0,
      paymentMethodLabel: row.paymentMethod?.label ?? null,
    };
  }

  private toDetail(
    row: Prisma.AccountReceivableGetPayload<{ include: typeof detailInclude }>,
  ) {
    const list = this.toListItem(row, new Date());
    return {
      ...list,
      notes: row.notes,
      customer: {
        ...list.customer,
        phone: row.customer.phone,
        email: row.customer.email,
      },
      paymentMethod: row.paymentMethod
        ? { id: row.paymentMethod.id, label: row.paymentMethod.label }
        : null,
      bankAccount: row.bankAccount
        ? {
            id: row.bankAccount.id,
            name: row.bankAccount.name,
            code: row.bankAccount.code,
          }
        : null,
      costCenter: row.costCenter
        ? { id: row.costCenter.id, name: row.costCenter.name }
        : null,
      createdBy: row.createdBy,
      renegotiatedFromId: row.renegotiatedFromId,
      installments: row.installments.map((inst) => {
        const amount = dec(inst.amount);
        const paid = dec(inst.paidAmount);
        const balance = Math.max(0, amount - paid);
        const displayStatus = resolveDisplayStatus({
          status:
            inst.status === 'CANCELLED'
              ? 'CANCELLED'
              : resolvePersistedStatus(balance, paid),
          dueDate: inst.dueDate,
          balance,
        });
        return {
          id: inst.id,
          number: inst.number,
          label: `${inst.number}/${row.installmentCount}`,
          dueDate: inst.dueDate.toISOString().slice(0, 10),
          amount,
          paidAmount: paid,
          balance,
          status: inst.status,
          displayStatus,
        };
      }),
      movements: row.movements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: dec(m.amount),
        paidAt: m.paidAt.toISOString().slice(0, 10),
        paymentMethodLabel: m.paymentMethod?.label ?? null,
        bankAccountName: m.bankAccount?.name ?? null,
        interestAmount: dec(m.interestAmount),
        fineAmount: dec(m.fineAmount),
        discountAmount: dec(m.discountAmount),
        notes: m.notes,
        operatorName: m.operator.name,
        reversesMovementId: m.reversesMovementId,
        createdAt: m.createdAt.toISOString(),
      })),
      history: row.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        amount: a.amount == null ? null : dec(a.amount),
        message: a.message,
        actorName: a.actor.name,
        createdAt: a.createdAt.toISOString(),
      })),
      operatorDiscountLimitPercent: this.operatorDiscountLimitPercent,
    };
  }

  private buildWhere(
    filters: ListReceivablesFilters,
  ): Prisma.AccountReceivableWhereInput {
    const { dueFrom, dueTo } = this.resolvePeriod(filters);
    const where: Prisma.AccountReceivableWhereInput = {};

    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.paymentMethodId)
      where.paymentMethodId = filters.paymentMethodId;
    if (filters.bankAccountId) where.bankAccountId = filters.bankAccountId;
    if (filters.costCenterId) where.costCenterId = filters.costCenterId;
    if (filters.origin && filters.origin !== 'ALL') {
      where.origin = filters.origin as ReceivableOrigin;
    }

    if (dueFrom || dueTo) {
      where.dueDate = {
        ...(dueFrom ? { gte: dueFrom } : {}),
        ...(dueTo ? { lte: dueTo } : {}),
      };
    }

    if (
      filters.status &&
      filters.status !== 'ALL' &&
      !this.isDerivedStatus(filters.status)
    ) {
      where.status = filters.status as ReceivableStatus;
    } else if (filters.status === 'OPEN' || filters.status === 'PARTIAL') {
      where.status = filters.status;
    } else if (!filters.status || filters.status === 'ALL') {
      // all
    } else if (this.isDerivedStatus(filters.status)) {
      where.status = { in: ['OPEN', 'PARTIAL'] };
    }

    const search = filters.search?.trim();
    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { document: { contains: search, mode: 'insensitive' } },
        { originRef: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { document: { contains: search } } },
        { customer: { code: { contains: search, mode: 'insensitive' } } },
        ...(/^\d+$/.test(search) ? [{ sequentialId: Number(search) }] : []),
      ];
    }

    return where;
  }

  private isDerivedStatus(status?: string) {
    return (
      status === 'DUE_TODAY' || status === 'OVERDUE' || status === 'VENCIDA'
    );
  }

  private matchesDisplayStatus(display: string, filter?: string) {
    if (!filter || filter === 'ALL') return true;
    if (filter === 'VENCIDA') return display === 'OVERDUE';
    return display === filter || (filter === 'OPEN' && display === 'OPEN');
  }

  private resolvePeriod(filters: ListReceivablesFilters): {
    dueFrom?: Date;
    dueTo?: Date;
  } {
    if (filters.dueFrom || filters.dueTo) {
      return {
        dueFrom: filters.dueFrom ? toUtcDateOnly(filters.dueFrom) : undefined,
        dueTo: filters.dueTo ? toUtcDateOnly(filters.dueTo) : undefined,
      };
    }
    const today = toUtcDateOnly(new Date());
    switch (filters.period) {
      case 'TODAY':
        return { dueFrom: today, dueTo: today };
      case 'WEEK': {
        const end = new Date(today);
        end.setUTCDate(end.getUTCDate() + 7);
        return { dueFrom: today, dueTo: end };
      }
      case 'MONTH': {
        const start = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
        );
        const end = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
        );
        return { dueFrom: start, dueTo: end };
      }
      case 'NEXT_MONTH': {
        const start = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1),
        );
        const end = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 0),
        );
        return { dueFrom: start, dueTo: end };
      }
      default:
        return {};
    }
  }
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}
