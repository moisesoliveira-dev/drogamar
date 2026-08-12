import { Injectable } from '@nestjs/common';
import type { BankAccountKind, Prisma } from '@prisma/client';
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
import { FluxoCaixaService } from './fluxo-caixa.service';

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

const KIND_PREFIX: Record<BankAccountKind, string> = {
  CASH: 'CX',
  CHECKING: 'CC',
  SAVINGS: 'CP',
  PAYMENT: 'PG',
  BANK: 'CB',
  OTHER: 'OT',
};

export const BANK_ACCOUNT_KIND_LABELS: Record<BankAccountKind, string> = {
  CASH: 'Caixa',
  CHECKING: 'Conta corrente',
  SAVINGS: 'Poupança',
  PAYMENT: 'Conta pagamento',
  BANK: 'Banco',
  OTHER: 'Outro',
};

export function maskAccountNumber(
  accountNumber: string | null | undefined,
): string | null {
  if (!accountNumber) return null;
  if (accountNumber.length > 4) return `****-${accountNumber.slice(-4)}`;
  return '****';
}

/** Stub RBAC — liberado até permissões reais. */
export function canRevealBankDetails(actorId?: string): boolean {
  void actorId;
  return true;
}

@Injectable()
export class CaixaBancosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fluxoCaixa: FluxoCaixaService,
  ) {}

  async getLookups() {
    const fluxo = await this.fluxoCaixa.getLookups();
    return {
      kinds: (Object.keys(BANK_ACCOUNT_KIND_LABELS) as BankAccountKind[]).map(
        (value) => ({
          value,
          label: BANK_ACCOUNT_KIND_LABELS[value],
        }),
      ),
      categories: fluxo.categories,
      costCenters: fluxo.costCenters,
      bankAccounts: fluxo.bankAccounts,
    };
  }

  async dashboard(filters: { period?: string; from?: string; to?: string }) {
    const { from, to } = this.fluxoCaixa.resolvePeriod(filters);
    const [accounts, movements] = await Promise.all([
      this.prisma.bankAccount.findMany({
        select: { id: true, active: true },
      }),
      this.prisma.cashFlowMovement.findMany({
        where: { status: 'REALIZED' },
        select: {
          bankAccountId: true,
          direction: true,
          kind: true,
          amount: true,
          occurredAt: true,
        },
      }),
    ]);

    const totalBalance = roundMoney(
      movements.reduce(
        (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
        0,
      ),
    );

    const inPeriod = movements.filter((m) => {
      const d = toUtcDateOnly(m.occurredAt);
      return d >= from && d <= to;
    });

    const periodInflows = roundMoney(
      inPeriod
        .filter((m) => m.direction === 'IN' && isOperationalKind(m.kind))
        .reduce((s, m) => s + dec(m.amount), 0),
    );
    const periodOutflows = roundMoney(
      inPeriod
        .filter((m) => m.direction === 'OUT' && isOperationalKind(m.kind))
        .reduce((s, m) => s + dec(m.amount), 0),
    );

    return {
      from: isoDate(from),
      to: isoDate(to),
      totalBalance,
      periodInflows,
      periodOutflows,
      result: roundMoney(periodInflows - periodOutflows),
      activeAccountsCount: accounts.filter((a) => a.active).length,
    };
  }

  async listAccounts(filters: {
    period?: string;
    from?: string;
    to?: string;
    search?: string;
    kind?: string;
    active?: string;
    revealSensitive?: boolean;
    actorId?: string;
  }) {
    const { from, to } = this.fluxoCaixa.resolvePeriod(filters);
    const reveal =
      Boolean(filters.revealSensitive) && canRevealBankDetails(filters.actorId);

    const where: Prisma.BankAccountWhereInput = {};
    if (filters.kind && filters.kind !== 'ALL') {
      where.kind = filters.kind as BankAccountKind;
    }
    if (filters.active === 'true') where.active = true;
    if (filters.active === 'false') where.active = false;
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { code: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { bankName: { contains: q, mode: 'insensitive' } },
        { agency: { contains: q, mode: 'insensitive' } },
        { accountNumber: { contains: q, mode: 'insensitive' } },
      ];
    }

    const accounts = await this.prisma.bankAccount.findMany({
      where,
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    });

    const movements = await this.prisma.cashFlowMovement.findMany({
      where: {
        bankAccountId: { in: accounts.map((a) => a.id) },
        status: 'REALIZED',
      },
      select: {
        bankAccountId: true,
        direction: true,
        kind: true,
        amount: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    const items = accounts.map((account) => {
      const rows = movements.filter((m) => m.bankAccountId === account.id);
      const balance = roundMoney(
        rows.reduce((sum, m) => sum + netEffect(m.direction, dec(m.amount)), 0),
      );
      const inPeriod = rows.filter((m) => {
        const d = toUtcDateOnly(m.occurredAt);
        return d >= from && d <= to;
      });
      const periodInflows = roundMoney(
        inPeriod
          .filter((m) => m.direction === 'IN' && isOperationalKind(m.kind))
          .reduce((s, m) => s + dec(m.amount), 0),
      );
      const periodOutflows = roundMoney(
        inPeriod
          .filter((m) => m.direction === 'OUT' && isOperationalKind(m.kind))
          .reduce((s, m) => s + dec(m.amount), 0),
      );
      const last = rows[0];
      return this.mapAccount(account, {
        balance,
        periodInflows,
        periodOutflows,
        lastMovementAt: last ? isoDate(last.occurredAt) : null,
        reveal,
      });
    });

    return {
      from: isoDate(from),
      to: isoDate(to),
      items,
      total: items.length,
    };
  }

  async getById(
    id: string,
    opts: {
      revealSensitive?: boolean;
      actorId?: string;
      period?: string;
      from?: string;
      to?: string;
    } = {},
  ) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) throw new CashFlowNotFoundError('Conta não encontrada.');

    const { from, to } = this.fluxoCaixa.resolvePeriod(opts);
    const reveal =
      Boolean(opts.revealSensitive) && canRevealBankDetails(opts.actorId);

    const movements = await this.prisma.cashFlowMovement.findMany({
      where: { bankAccountId: id, status: 'REALIZED' },
      select: {
        direction: true,
        kind: true,
        amount: true,
        occurredAt: true,
      },
      orderBy: { occurredAt: 'desc' },
    });

    const balance = roundMoney(
      movements.reduce(
        (sum, m) => sum + netEffect(m.direction, dec(m.amount)),
        0,
      ),
    );
    const inPeriod = movements.filter((m) => {
      const d = toUtcDateOnly(m.occurredAt);
      return d >= from && d <= to;
    });
    const periodInflows = roundMoney(
      inPeriod
        .filter((m) => m.direction === 'IN' && isOperationalKind(m.kind))
        .reduce((s, m) => s + dec(m.amount), 0),
    );
    const periodOutflows = roundMoney(
      inPeriod
        .filter((m) => m.direction === 'OUT' && isOperationalKind(m.kind))
        .reduce((s, m) => s + dec(m.amount), 0),
    );

    return {
      ...this.mapAccount(account, {
        balance,
        periodInflows,
        periodOutflows,
        lastMovementAt: movements[0] ? isoDate(movements[0].occurredAt) : null,
        reveal,
      }),
      from: isoDate(from),
      to: isoDate(to),
      result: roundMoney(periodInflows - periodOutflows),
    };
  }

  async createAccount(
    actorId: string,
    input: {
      code?: string | null;
      name: string;
      bankName?: string | null;
      kind?: BankAccountKind;
      agency?: string | null;
      accountNumber?: string | null;
      accountDigit?: string | null;
      notes?: string | null;
      openingBalance?: number | null;
      openingBalanceDate?: string | null;
    },
  ) {
    if (!input.name?.trim()) {
      throw new CashFlowValidationError(
        'Informe o nome da conta.',
        'NAME_REQUIRED',
      );
    }

    const kind = input.kind ?? 'OTHER';
    if (!KIND_PREFIX[kind]) {
      throw new CashFlowValidationError(
        'Tipo de conta inválido.',
        'INVALID_KIND',
      );
    }

    const code = input.code?.trim() || (await this.nextCode(kind));
    const existing = await this.prisma.bankAccount.findUnique({
      where: { code },
    });
    if (existing) {
      throw new CashFlowValidationError(
        'Já existe uma conta com este código.',
        'CODE_EXISTS',
      );
    }

    const opening = roundMoney(input.openingBalance ?? 0);
    const occurredAt =
      input.openingBalanceDate?.trim() || isoDate(toUtcDateOnly(new Date()));

    const accountId = await this.prisma.$transaction(async (tx) => {
      const account = await tx.bankAccount.create({
        data: {
          code,
          name: input.name.trim(),
          bankName: input.bankName?.trim() || null,
          kind,
          agency: input.agency?.trim() || null,
          accountNumber: input.accountNumber?.trim() || null,
          accountDigit: input.accountDigit?.trim() || null,
          notes: input.notes?.trim() || null,
          active: true,
          createdById: actorId,
        },
      });

      await tx.bankAccountAuditLog.create({
        data: {
          bankAccountId: account.id,
          actorId,
          action: 'CREATE',
          message: `Conta ${account.code} criada.`,
          payloadJson: {
            code: account.code,
            name: account.name,
            kind: account.kind,
            openingBalance: opening,
          },
        },
      });

      if (opening > 0.0001) {
        const movement = await tx.cashFlowMovement.create({
          data: {
            direction: 'IN',
            kind: 'ADJUSTMENT',
            status: 'REALIZED',
            amount: opening,
            occurredAt: toUtcDateOnly(occurredAt),
            description: `Saldo inicial — ${account.code}`,
            bankAccountId: account.id,
            origin: 'MANUAL',
            operatorId: actorId,
          },
        });
        await tx.cashFlowAuditLog.create({
          data: {
            movementId: movement.id,
            actorId,
            action: 'OPENING_BALANCE',
            amount: opening,
            message: 'Saldo de abertura.',
          },
        });
        await tx.bankAccountAuditLog.create({
          data: {
            bankAccountId: account.id,
            actorId,
            action: 'OPENING_BALANCE',
            amount: opening,
            message: 'Saldo inicial lançado.',
          },
        });
      }

      return account.id;
    });

    return this.getById(accountId, { actorId, revealSensitive: false });
  }

  async updateAccount(
    actorId: string,
    id: string,
    input: {
      name?: string;
      bankName?: string | null;
      kind?: BankAccountKind;
      agency?: string | null;
      accountNumber?: string | null;
      accountDigit?: string | null;
      notes?: string | null;
    },
  ) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) throw new CashFlowNotFoundError('Conta não encontrada.');

    if (input.kind && !KIND_PREFIX[input.kind]) {
      throw new CashFlowValidationError(
        'Tipo de conta inválido.',
        'INVALID_KIND',
      );
    }
    if (input.name != null && !input.name.trim()) {
      throw new CashFlowValidationError(
        'Informe o nome da conta.',
        'NAME_REQUIRED',
      );
    }

    const before = {
      name: account.name,
      bankName: account.bankName,
      kind: account.kind,
      agency: account.agency,
      accountNumber: account.accountNumber,
      accountDigit: account.accountDigit,
      notes: account.notes,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.bankAccount.update({
        where: { id },
        data: {
          ...(input.name != null ? { name: input.name.trim() } : {}),
          ...(input.bankName !== undefined
            ? { bankName: input.bankName?.trim() || null }
            : {}),
          ...(input.kind ? { kind: input.kind } : {}),
          ...(input.agency !== undefined
            ? { agency: input.agency?.trim() || null }
            : {}),
          ...(input.accountNumber !== undefined
            ? { accountNumber: input.accountNumber?.trim() || null }
            : {}),
          ...(input.accountDigit !== undefined
            ? { accountDigit: input.accountDigit?.trim() || null }
            : {}),
          ...(input.notes !== undefined
            ? { notes: input.notes?.trim() || null }
            : {}),
        },
      });
      await tx.bankAccountAuditLog.create({
        data: {
          bankAccountId: id,
          actorId,
          action: 'UPDATE',
          message: 'Dados da conta atualizados.',
          payloadJson: { before, after: input },
        },
      });
    });

    return this.getById(id, { actorId });
  }

  async setActive(actorId: string, id: string, active: boolean) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) throw new CashFlowNotFoundError('Conta não encontrada.');
    if (account.active === active) {
      return this.getById(id, { actorId });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bankAccount.update({
        where: { id },
        data: { active },
      });
      await tx.bankAccountAuditLog.create({
        data: {
          bankAccountId: id,
          actorId,
          action: active ? 'ACTIVATE' : 'DEACTIVATE',
          message: active ? 'Conta ativada.' : 'Conta inativada.',
        },
      });
    });

    return this.getById(id, { actorId });
  }

  async extrato(
    id: string,
    filters: {
      period?: string;
      from?: string;
      to?: string;
      direction?: string;
      status?: string;
      search?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    await this.requireAccount(id);
    return this.fluxoCaixa.listMovements({
      ...filters,
      bankAccountId: id,
      status: filters.status ?? 'ALL',
    });
  }

  async historico(id: string) {
    await this.requireAccount(id);

    const [accountAudits, cashAudits] = await Promise.all([
      this.prisma.bankAccountAuditLog.findMany({
        where: { bankAccountId: id },
        include: { actor: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.cashFlowAuditLog.findMany({
        where: {
          movement: { bankAccountId: id },
        },
        include: {
          actor: { select: { id: true, name: true } },
          movement: {
            select: {
              id: true,
              sequentialId: true,
              direction: true,
              amount: true,
              description: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const items = [
      ...accountAudits.map((a) => ({
        id: a.id,
        source: 'ACCOUNT' as const,
        action: a.action,
        amount: a.amount == null ? null : dec(a.amount),
        message: a.message,
        createdAt: a.createdAt.toISOString(),
        actorName: a.actor.name,
        movementId: null as string | null,
        movementNumber: null as string | null,
      })),
      ...cashAudits.map((a) => ({
        id: a.id,
        source: 'CASH_FLOW' as const,
        action: a.action,
        amount: a.amount == null ? null : dec(a.amount),
        message: a.message,
        createdAt: a.createdAt.toISOString(),
        actorName: a.actor.name,
        movementId: a.movementId,
        movementNumber: a.movement
          ? `CF-${String(a.movement.sequentialId).padStart(6, '0')}`
          : null,
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { items };
  }

  async createEntrada(
    actorId: string,
    id: string,
    input: {
      amount: number;
      occurredAt: string;
      description: string;
      categoryId?: string | null;
      costCenterId?: string | null;
      notes?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    await this.requireAccount(id, true);
    const movement = await this.fluxoCaixa.createManual(actorId, {
      ...input,
      direction: 'IN',
      bankAccountId: id,
    });
    await this.writeAccountAudit(
      actorId,
      id,
      'ENTRADA',
      input.amount,
      input.description,
    );
    return movement;
  }

  async createSaida(
    actorId: string,
    id: string,
    input: {
      amount: number;
      occurredAt: string;
      description: string;
      categoryId?: string | null;
      costCenterId?: string | null;
      notes?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    await this.requireAccount(id, true);
    const movement = await this.fluxoCaixa.createManual(actorId, {
      ...input,
      direction: 'OUT',
      bankAccountId: id,
    });
    await this.writeAccountAudit(
      actorId,
      id,
      'SAIDA',
      input.amount,
      input.description,
    );
    return movement;
  }

  async createTransfer(
    actorId: string,
    input: {
      amount: number;
      occurredAt: string;
      fromBankAccountId: string;
      toBankAccountId: string;
      description?: string | null;
      notes?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    const movement = await this.fluxoCaixa.createTransfer(actorId, input);
    await this.writeAccountAudit(
      actorId,
      input.fromBankAccountId,
      'TRANSFER_OUT',
      input.amount,
      input.description ?? 'Transferência',
    );
    await this.writeAccountAudit(
      actorId,
      input.toBankAccountId,
      'TRANSFER_IN',
      input.amount,
      input.description ?? 'Transferência',
    );
    return movement;
  }

  async adjustBalance(
    actorId: string,
    id: string,
    input: {
      targetBalance?: number;
      difference?: number;
      reason: string;
      occurredAt: string;
      notes?: string | null;
      idempotencyKey?: string | null;
    },
  ) {
    await this.requireAccount(id, true);
    const movement = await this.fluxoCaixa.adjustBalance(actorId, {
      ...input,
      bankAccountId: id,
    });
    await this.writeAccountAudit(
      actorId,
      id,
      'ADJUST_BALANCE',
      movement.amount,
      input.reason,
    );
    return movement;
  }

  async reverseMovement(actorId: string, movementId: string, reason: string) {
    const movement = await this.fluxoCaixa.reverseMovement(
      actorId,
      movementId,
      reason,
    );
    await this.writeAccountAudit(
      actorId,
      movement.bankAccount.id,
      'REVERSE',
      movement.amount,
      reason,
    );
    return movement;
  }

  private async requireAccount(id: string, mustBeActive = false) {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) throw new CashFlowNotFoundError('Conta não encontrada.');
    if (mustBeActive && !account.active) {
      throw new CashFlowValidationError(
        'Conta inativa.',
        'INACTIVE_BANK_ACCOUNT',
      );
    }
    return account;
  }

  private async nextCode(kind: BankAccountKind): Promise<string> {
    const prefix = KIND_PREFIX[kind];
    const existing = await this.prisma.bankAccount.findMany({
      where: { code: { startsWith: `${prefix}-` } },
      select: { code: true },
    });
    let max = 0;
    for (const row of existing) {
      const match = row.code.match(new RegExp(`^${prefix}-(\\d+)$`, 'i'));
      if (match) max = Math.max(max, Number(match[1]));
    }
    return `${prefix}-${String(max + 1).padStart(3, '0')}`;
  }

  private async writeAccountAudit(
    actorId: string,
    bankAccountId: string,
    action: string,
    amount: number | null | undefined,
    message: string,
  ) {
    await this.prisma.bankAccountAuditLog.create({
      data: {
        bankAccountId,
        actorId,
        action,
        amount: amount == null ? null : roundMoney(amount),
        message: message?.trim() || null,
      },
    });
  }

  private mapAccount(
    account: {
      id: string;
      code: string;
      name: string;
      bankName: string | null;
      kind: BankAccountKind;
      agency: string | null;
      accountNumber: string | null;
      accountDigit: string | null;
      notes: string | null;
      active: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    extras: {
      balance: number;
      periodInflows: number;
      periodOutflows: number;
      lastMovementAt: string | null;
      reveal: boolean;
    },
  ) {
    return {
      id: account.id,
      code: account.code,
      name: account.name,
      bankName: account.bankName,
      kind: account.kind,
      kindLabel: BANK_ACCOUNT_KIND_LABELS[account.kind] ?? account.kind,
      agency: account.agency,
      accountNumber: extras.reveal
        ? account.accountNumber
        : maskAccountNumber(account.accountNumber),
      accountDigit: extras.reveal
        ? account.accountDigit
        : account.accountDigit
          ? '*'
          : null,
      notes: account.notes,
      active: account.active,
      balance: extras.balance,
      periodInflows: extras.periodInflows,
      periodOutflows: extras.periodOutflows,
      result: roundMoney(extras.periodInflows - extras.periodOutflows),
      lastMovementAt: extras.lastMovementAt,
      createdAt: account.createdAt.toISOString(),
      updatedAt: account.updatedAt.toISOString(),
      sensitiveRevealed: extras.reveal,
    };
  }
}
