import { Injectable } from '@nestjs/common';
import type { Prisma, PayableOrigin, PayableStatus } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  PayableNotFoundError,
  PayablePermissionError,
  PayableValidationError,
} from '../../domain/payable/errors';
import {
  calculateLateCharges,
  calculateReceivableMoney as calculatePayableMoney,
  daysOverdue,
  resolveDisplayStatus,
  resolvePersistedStatus,
  toUtcDateOnly,
} from '../../domain/receivable/receivable-money';
import { CashFlowLedgerService } from './cash-flow-ledger.service';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

const detailInclude = {
  supplier: true,
  category: true,
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
  schedules: {
    orderBy: { scheduledDate: 'asc' as const },
  },
  approvals: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 20,
  },
  auditLogs: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
} satisfies Prisma.AccountPayableInclude;

export type ListPayablesFilters = {
  search?: string;
  status?: string;
  supplierId?: string;
  categoryId?: string;
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
export class ContasPagarService {
  /** Limite de desconto do operador (%) — preparado para RBAC. */
  private readonly operatorDiscountLimitPercent = 10;
  private readonly canApplyDiscount = true;
  private readonly canReverse = true;
  private readonly canRenegotiate = true;
  /** Valores >= limiar exigem aprovação antes do pagamento. */
  private readonly approvalAmountThreshold = 10_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cashFlowLedger: CashFlowLedgerService,
  ) {}

  async getLookups() {
    const [paymentMethods, bankAccounts, costCenters, categories] =
      await Promise.all([
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
        this.prisma.expenseCategory.findMany({
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
      categories: categories.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
      })),
      operatorDiscountLimitPercent: this.operatorDiscountLimitPercent,
      approvalAmountThreshold: this.approvalAmountThreshold,
    };
  }

  async searchSuppliers(search?: string, page = 1, pageSize = 20) {
    const q = search?.trim();
    const where: Prisma.SupplierWhereInput = {
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
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      items: items.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.name,
        documentType: s.documentType,
        document: s.document,
        phone: s.phone,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async dashboard(filters: ListPayablesFilters) {
    const { dueFrom, dueTo } = this.resolvePeriod(filters);
    const openStatuses: PayableStatus[] = ['OPEN', 'PARTIAL'];
    const today = toUtcDateOnly(new Date());

    const openRows = await this.prisma.accountPayable.findMany({
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

    const paymentWhere: Prisma.PayableMovementWhereInput = {
      type: 'PAYMENT',
      ...(dueFrom || dueTo
        ? {
            paidAt: {
              ...(dueFrom ? { gte: dueFrom } : {}),
              ...(dueTo ? { lte: dueTo } : {}),
            },
          }
        : {}),
    };
    const paidAgg = await this.prisma.payableMovement.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
    });

    const expectedRows = await this.prisma.accountPayable.findMany({
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
      paidInPeriod: round(dec(paidAgg._sum.amount)),
      expectedInPeriod: round(expectedInPeriod),
    };
  }

  async list(filters: ListPayablesFilters) {
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
      this.prisma.accountPayable.count({ where }),
      this.prisma.accountPayable.findMany({
        where,
        include: {
          supplier: true,
          category: true,
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

    let filteredTotal = total;
    if (
      filters.status &&
      filters.status !== 'ALL' &&
      this.isDerivedStatus(filters.status)
    ) {
      const all = await this.prisma.accountPayable.findMany({
        where: this.buildWhere({ ...filters, status: 'ALL' }),
        include: {
          supplier: true,
          category: true,
          paymentMethod: true,
          installments: true,
        },
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
    const row = await this.prisma.accountPayable.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!row) throw new PayableNotFoundError();
    await this.ensureLateCharges(row.id);
    const refreshed = await this.prisma.accountPayable.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!refreshed) throw new PayableNotFoundError();
    return this.toDetail(refreshed);
  }

  async create(
    operatorId: string,
    input: {
      supplierId: string;
      description: string;
      document?: string | null;
      categoryId?: string | null;
      originalAmount: number;
      issueDate: string;
      dueDate: string;
      origin?: PayableOrigin;
      originRef?: string | null;
      paymentMethodId?: string | null;
      bankAccountId?: string | null;
      costCenterId?: string | null;
      installmentCount?: number;
      requiresApproval?: boolean;
      notes?: string | null;
    },
  ) {
    if (!input.description?.trim()) {
      throw new PayableValidationError(
        'Informe a descrição.',
        'INVALID_DESCRIPTION',
      );
    }
    if (!Number.isFinite(input.originalAmount) || input.originalAmount <= 0) {
      throw new PayableValidationError(
        'Valor deve ser maior que zero.',
        'INVALID_AMOUNT',
      );
    }
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: input.supplierId, active: true },
    });
    if (!supplier) {
      throw new PayableValidationError(
        'Fornecedor inválido.',
        'INVALID_SUPPLIER',
      );
    }
    if (input.categoryId) {
      const category = await this.prisma.expenseCategory.findFirst({
        where: { id: input.categoryId, active: true },
      });
      if (!category) {
        throw new PayableValidationError(
          'Categoria inválida.',
          'INVALID_CATEGORY',
        );
      }
    }
    const issueDate = toUtcDateOnly(input.issueDate);
    const dueDate = toUtcDateOnly(input.dueDate);
    if (dueDate.getTime() < issueDate.getTime()) {
      throw new PayableValidationError(
        'Vencimento não pode ser anterior à emissão.',
        'INVALID_DATES',
      );
    }
    const installmentCount = Math.max(
      1,
      Math.min(input.installmentCount ?? 1, 60),
    );
    const installmentAmount = round(input.originalAmount / installmentCount);
    const requiresApproval =
      Boolean(input.requiresApproval) ||
      input.originalAmount >= this.approvalAmountThreshold;

    const created = await this.prisma.$transaction(async (tx) => {
      const payable = await tx.accountPayable.create({
        data: {
          supplierId: supplier.id,
          origin: input.origin ?? 'MANUAL',
          originRef: input.originRef ?? null,
          description: input.description.trim(),
          document: input.document?.trim() || null,
          categoryId: input.categoryId || null,
          issueDate,
          dueDate,
          originalAmount: input.originalAmount,
          paymentMethodId: input.paymentMethodId || null,
          bankAccountId: input.bankAccountId || null,
          costCenterId: input.costCenterId || null,
          installmentCount,
          requiresApproval,
          approvalStatus: 'NONE',
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
        }
        const amount =
          i === installmentCount
            ? round(
                input.originalAmount -
                  installmentAmount * (installmentCount - 1),
              )
            : installmentAmount;
        await tx.payableInstallment.create({
          data: {
            payableId: payable.id,
            number: i,
            dueDate: installmentCount === 1 ? dueDate : toUtcDateOnly(instDue),
            amount,
            status: 'OPEN',
          },
        });
      }

      await tx.payableAuditLog.create({
        data: {
          payableId: payable.id,
          actorId: operatorId,
          action: 'CREATE',
          amount: input.originalAmount,
          message: requiresApproval
            ? 'Conta a pagar criada (requer aprovação).'
            : 'Conta a pagar criada.',
        },
      });

      return payable.id;
    });

    return this.getById(created);
  }

  async registerPayment(
    operatorId: string,
    payableId: string,
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
      const existing = await this.prisma.payableMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (existing) return this.getById(existing.payableId);
    }

    await this.ensureLateCharges(payableId);
    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
      include: { installments: true },
    });
    if (!row) throw new PayableNotFoundError();
    if (
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED' ||
      row.status === 'SETTLED'
    ) {
      throw new PayableValidationError(
        'Conta não permite pagamento neste status.',
        'INVALID_STATUS',
      );
    }
    if (row.requiresApproval && row.approvalStatus !== 'APPROVED') {
      throw new PayableValidationError(
        'Pagamento exige aprovação prévia.',
        'APPROVAL_REQUIRED',
      );
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new PayableValidationError(
        'Valor pago inválido.',
        'INVALID_AMOUNT',
      );
    }

    const discountAmount = input.discountAmount ?? 0;
    if (discountAmount > 0) {
      if (!this.canApplyDiscount) {
        throw new PayablePermissionError(
          'Sem permissão para aplicar desconto.',
        );
      }
      const money = this.moneyForRow(row);
      const percent = (discountAmount / money.updatedAmount) * 100;
      if (percent > this.operatorDiscountLimitPercent + 0.0001) {
        throw new PayableValidationError(
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
      throw new PayableValidationError(
        'Valor pago maior que o saldo da conta.',
        'AMOUNT_EXCEEDS_BALANCE',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      const paymentMovement = await tx.payableMovement.create({
        data: {
          payableId,
          installmentId: input.installmentId || null,
          type: 'PAYMENT',
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

      await this.cashFlowLedger.recordFromPayablePayment(tx, {
        payableMovementId: paymentMovement.id,
        amount: input.amount,
        occurredAt: input.paidAt,
        description: row.description,
        bankAccountId: input.bankAccountId || row.bankAccountId,
        categoryId: row.categoryId,
        costCenterId: row.costCenterId,
        operatorId,
        originRef: row.document || payableId,
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
      const nextMoney = calculatePayableMoney({
        originalAmount: dec(row.originalAmount),
        discountAmount: newDiscount,
        interestAmount: newInterest,
        fineAmount: newFine,
        paidAmount: newPaid,
      });
      const status = resolvePersistedStatus(nextMoney.balance, newPaid);

      await tx.accountPayable.update({
        where: { id: payableId },
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
          await tx.payableInstallment.update({
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
        await tx.payableInstallment.update({
          where: { id: inst.id },
          data: {
            paidAmount: instPaid,
            status: resolvePersistedStatus(instBalance, instPaid),
          },
        });
      }

      await tx.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'PAYMENT',
          amount: input.amount,
          message:
            status === 'SETTLED' ? 'Pagamento integral.' : 'Pagamento parcial.',
        },
      });
    });

    return this.getById(payableId);
  }

  async reversePayment(
    operatorId: string,
    payableId: string,
    movementId: string,
    reason: string,
  ) {
    if (!this.canReverse) {
      throw new PayablePermissionError('Sem permissão para estornar.');
    }
    if (!reason?.trim()) {
      throw new PayableValidationError(
        'Informe o motivo do estorno.',
        'REASON_REQUIRED',
      );
    }
    const movement = await this.prisma.payableMovement.findFirst({
      where: { id: movementId, payableId, type: 'PAYMENT' },
    });
    if (!movement) {
      throw new PayableNotFoundError('Pagamento não encontrado.');
    }
    const already = await this.prisma.payableMovement.findFirst({
      where: { reversesMovementId: movementId, type: 'REVERSAL' },
    });
    if (already) {
      throw new PayableValidationError(
        'Pagamento já estornado.',
        'ALREADY_REVERSED',
      );
    }

    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
      include: { installments: true },
    });
    if (!row) throw new PayableNotFoundError();

    await this.prisma.$transaction(async (tx) => {
      await tx.payableMovement.create({
        data: {
          payableId,
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
        payableMovementId: movement.id,
        operatorId,
        reason: reason.trim(),
      });

      const newPaid = Math.max(0, dec(row.paidAmount) - dec(movement.amount));
      const nextMoney = calculatePayableMoney({
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

      await tx.accountPayable.update({
        where: { id: payableId },
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
          await tx.payableInstallment.update({
            where: { id: inst.id },
            data: {
              paidAmount: instPaid,
              status: resolvePersistedStatus(instBalance, instPaid),
            },
          });
        }
      }

      await tx.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'REVERSAL',
          amount: dec(movement.amount),
          message: reason.trim(),
        },
      });
    });

    return this.getById(payableId);
  }

  async renegotiate(
    operatorId: string,
    payableId: string,
    input: {
      installmentCount: number;
      firstDueDate: string;
      interestAmount?: number;
      discountAmount?: number;
      notes?: string | null;
    },
  ) {
    if (!this.canRenegotiate) {
      throw new PayablePermissionError('Sem permissão para renegociar.');
    }
    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
    });
    if (!row) throw new PayableNotFoundError();
    if (
      row.status === 'SETTLED' ||
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED'
    ) {
      throw new PayableValidationError(
        'Conta não permite renegociação.',
        'INVALID_STATUS',
      );
    }
    const money = this.moneyForRow(row);
    if (money.balance <= 0) {
      throw new PayableValidationError(
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
    const requiresApproval =
      row.requiresApproval || newAmount >= this.approvalAmountThreshold;

    const newId = await this.prisma.$transaction(async (tx) => {
      await tx.accountPayable.update({
        where: { id: payableId },
        data: { status: 'RENEGOTIATED' },
      });
      const created = await tx.accountPayable.create({
        data: {
          supplierId: row.supplierId,
          origin: 'OTHER',
          originRef: `RENEG-${row.sequentialId}`,
          description: `Renegociação da conta #${row.sequentialId}`,
          document: row.document,
          categoryId: row.categoryId,
          issueDate: toUtcDateOnly(new Date()),
          dueDate: toUtcDateOnly(input.firstDueDate),
          originalAmount: newAmount,
          interestAmount: interest,
          discountAmount: discount,
          installmentCount: count,
          notes: input.notes?.trim() || null,
          createdById: operatorId,
          renegotiatedFromId: payableId,
          paymentMethodId: row.paymentMethodId,
          bankAccountId: row.bankAccountId,
          costCenterId: row.costCenterId,
          requiresApproval,
          approvalStatus: 'NONE',
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
        await tx.payableInstallment.create({
          data: {
            payableId: created.id,
            number: i,
            dueDate: due,
            amount,
            status: 'OPEN',
          },
        });
      }
      await tx.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'RENEGOTIATE',
          amount: newAmount,
          message: `Renegociada na conta #${created.sequentialId}`,
        },
      });
      await tx.payableAuditLog.create({
        data: {
          payableId: created.id,
          actorId: operatorId,
          action: 'CREATE',
          amount: newAmount,
          message: `Originada da renegociação #${row.sequentialId}`,
        },
      });
      return created.id;
    });

    return this.getById(newId);
  }

  async cancel(operatorId: string, payableId: string, reason: string) {
    if (!reason?.trim()) {
      throw new PayableValidationError('Informe o motivo.', 'REASON_REQUIRED');
    }
    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
    });
    if (!row) throw new PayableNotFoundError();
    if (row.status === 'SETTLED' || row.status === 'CANCELLED') {
      throw new PayableValidationError(
        'Conta não pode ser cancelada.',
        'INVALID_STATUS',
      );
    }
    await this.prisma.$transaction([
      this.prisma.accountPayable.update({
        where: { id: payableId },
        data: { status: 'CANCELLED' },
      }),
      this.prisma.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'CANCEL',
          message: reason.trim(),
        },
      }),
    ]);
    return this.getById(payableId);
  }

  async schedulePayment(
    operatorId: string,
    payableId: string,
    input: {
      scheduledDate: string;
      amount: number;
      paymentMethodId?: string | null;
      bankAccountId?: string | null;
      notes?: string | null;
    },
  ) {
    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
    });
    if (!row) throw new PayableNotFoundError();
    if (
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED' ||
      row.status === 'SETTLED'
    ) {
      throw new PayableValidationError(
        'Conta não permite agendamento neste status.',
        'INVALID_STATUS',
      );
    }
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new PayableValidationError(
        'Valor do agendamento inválido.',
        'INVALID_AMOUNT',
      );
    }
    const money = this.moneyForRow(row);
    if (input.amount > money.balance + 0.0001) {
      throw new PayableValidationError(
        'Valor agendado maior que o saldo da conta.',
        'AMOUNT_EXCEEDS_BALANCE',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payableSchedule.create({
        data: {
          payableId,
          scheduledDate: toUtcDateOnly(input.scheduledDate),
          amount: input.amount,
          paymentMethodId: input.paymentMethodId || null,
          bankAccountId: input.bankAccountId || null,
          notes: input.notes?.trim() || null,
          status: 'SCHEDULED',
          createdById: operatorId,
        },
      });
      await tx.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'SCHEDULE',
          amount: input.amount,
          message: `Pagamento agendado para ${toUtcDateOnly(input.scheduledDate).toISOString().slice(0, 10)}.`,
        },
      });
    });

    return this.getById(payableId);
  }

  async requestApproval(
    operatorId: string,
    payableId: string,
    reason?: string | null,
  ) {
    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
    });
    if (!row) throw new PayableNotFoundError();
    if (
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED' ||
      row.status === 'SETTLED'
    ) {
      throw new PayableValidationError(
        'Conta não permite solicitação de aprovação.',
        'INVALID_STATUS',
      );
    }
    if (row.approvalStatus === 'APPROVED') {
      throw new PayableValidationError(
        'Conta já aprovada.',
        'ALREADY_APPROVED',
      );
    }
    if (row.approvalStatus === 'PENDING') {
      throw new PayableValidationError(
        'Aprovação já solicitada.',
        'ALREADY_PENDING',
      );
    }

    const money = this.moneyForRow(row);
    await this.prisma.$transaction(async (tx) => {
      await tx.accountPayable.update({
        where: { id: payableId },
        data: {
          requiresApproval: true,
          approvalStatus: 'PENDING',
        },
      });
      await tx.payableApproval.create({
        data: {
          payableId,
          status: 'PENDING',
          amount: money.balance,
          reason: reason?.trim() || null,
          actorId: operatorId,
        },
      });
      await tx.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'REQUEST_APPROVAL',
          amount: money.balance,
          message: reason?.trim() || 'Aprovação solicitada.',
        },
      });
    });

    return this.getById(payableId);
  }

  async approve(operatorId: string, payableId: string, reason?: string | null) {
    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
    });
    if (!row) throw new PayableNotFoundError();
    if (row.approvalStatus === 'APPROVED') {
      throw new PayableValidationError(
        'Conta já aprovada.',
        'ALREADY_APPROVED',
      );
    }
    if (
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED' ||
      row.status === 'SETTLED'
    ) {
      throw new PayableValidationError(
        'Conta não permite aprovação neste status.',
        'INVALID_STATUS',
      );
    }

    const money = this.moneyForRow(row);
    await this.prisma.$transaction(async (tx) => {
      await tx.accountPayable.update({
        where: { id: payableId },
        data: {
          requiresApproval: true,
          approvalStatus: 'APPROVED',
        },
      });
      await tx.payableApproval.create({
        data: {
          payableId,
          status: 'APPROVED',
          amount: money.balance,
          reason: reason?.trim() || null,
          actorId: operatorId,
        },
      });
      await tx.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'APPROVE',
          amount: money.balance,
          message: reason?.trim() || 'Pagamento aprovado.',
        },
      });
    });

    return this.getById(payableId);
  }

  async reject(operatorId: string, payableId: string, reason: string) {
    if (!reason?.trim()) {
      throw new PayableValidationError(
        'Informe o motivo da rejeição.',
        'REASON_REQUIRED',
      );
    }
    const row = await this.prisma.accountPayable.findUnique({
      where: { id: payableId },
    });
    if (!row) throw new PayableNotFoundError();
    if (row.approvalStatus === 'REJECTED') {
      throw new PayableValidationError(
        'Conta já rejeitada.',
        'ALREADY_REJECTED',
      );
    }
    if (
      row.status === 'CANCELLED' ||
      row.status === 'RENEGOTIATED' ||
      row.status === 'SETTLED'
    ) {
      throw new PayableValidationError(
        'Conta não permite rejeição neste status.',
        'INVALID_STATUS',
      );
    }

    const money = this.moneyForRow(row);
    await this.prisma.$transaction(async (tx) => {
      await tx.accountPayable.update({
        where: { id: payableId },
        data: {
          requiresApproval: true,
          approvalStatus: 'REJECTED',
        },
      });
      await tx.payableApproval.create({
        data: {
          payableId,
          status: 'REJECTED',
          amount: money.balance,
          reason: reason.trim(),
          actorId: operatorId,
        },
      });
      await tx.payableAuditLog.create({
        data: {
          payableId,
          actorId: operatorId,
          action: 'REJECT',
          amount: money.balance,
          message: reason.trim(),
        },
      });
    });

    return this.getById(payableId);
  }

  private async ensureLateCharges(id: string) {
    const row = await this.prisma.accountPayable.findUnique({ where: { id } });
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
    await this.prisma.accountPayable.update({
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
    return calculatePayableMoney({
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
      origin: PayableOrigin;
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
      status: PayableStatus;
      approvalStatus: string;
      requiresApproval: boolean;
      supplier: {
        id: string;
        code: string;
        name: string;
        document: string | null;
        documentType: string | null;
      };
      category: { id: string; code: string; name: string } | null;
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
      number: `CP-${row.sequentialId}`,
      supplier: {
        id: row.supplier.id,
        code: row.supplier.code,
        name: row.supplier.name,
        document: row.supplier.document,
        documentType: row.supplier.documentType,
      },
      category: row.category
        ? {
            id: row.category.id,
            code: row.category.code,
            name: row.category.name,
          }
        : null,
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
      requiresApproval: row.requiresApproval,
      approvalStatus: row.approvalStatus,
    };
  }

  private toDetail(
    row: Prisma.AccountPayableGetPayload<{ include: typeof detailInclude }>,
  ) {
    const list = this.toListItem(row, new Date());
    return {
      ...list,
      notes: row.notes,
      supplier: {
        ...list.supplier,
        phone: row.supplier.phone,
        email: row.supplier.email,
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
      schedules: row.schedules.map((s) => ({
        id: s.id,
        scheduledDate: s.scheduledDate.toISOString().slice(0, 10),
        amount: dec(s.amount),
        paymentMethodId: s.paymentMethodId,
        bankAccountId: s.bankAccountId,
        notes: s.notes,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
      })),
      approvals: row.approvals.map((a) => ({
        id: a.id,
        status: a.status,
        amount: dec(a.amount),
        reason: a.reason,
        actorName: a.actor.name,
        createdAt: a.createdAt.toISOString(),
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
      approvalAmountThreshold: this.approvalAmountThreshold,
    };
  }

  private buildWhere(
    filters: ListPayablesFilters,
  ): Prisma.AccountPayableWhereInput {
    const { dueFrom, dueTo } = this.resolvePeriod(filters);
    const where: Prisma.AccountPayableWhereInput = {};

    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.paymentMethodId)
      where.paymentMethodId = filters.paymentMethodId;
    if (filters.bankAccountId) where.bankAccountId = filters.bankAccountId;
    if (filters.costCenterId) where.costCenterId = filters.costCenterId;
    if (filters.origin && filters.origin !== 'ALL') {
      where.origin = filters.origin as PayableOrigin;
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
      where.status = filters.status as PayableStatus;
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
        { supplier: { name: { contains: search, mode: 'insensitive' } } },
        { supplier: { document: { contains: search } } },
        { supplier: { code: { contains: search, mode: 'insensitive' } } },
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

  private resolvePeriod(filters: ListPayablesFilters): {
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
