import { Injectable } from '@nestjs/common';
import type {
  CashFlowDirection,
  CashFlowKind,
  CashFlowOrigin,
  Prisma,
} from '@prisma/client';
import {
  CashFlowNotFoundError,
  CashFlowValidationError,
} from '../../domain/cash-flow/errors';
import {
  roundMoney,
  toUtcDateOnly,
} from '../../domain/cash-flow/cash-flow-money';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

export type LedgerReceiptInput = {
  receivableMovementId: string;
  amount: number;
  occurredAt: Date | string;
  description: string;
  bankAccountId?: string | null;
  categoryId?: string | null;
  costCenterId?: string | null;
  operatorId: string;
  originRef?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
};

export type LedgerPaymentInput = {
  payableMovementId: string;
  amount: number;
  occurredAt: Date | string;
  description: string;
  bankAccountId?: string | null;
  categoryId?: string | null;
  costCenterId?: string | null;
  operatorId: string;
  originRef?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
};

export type ReverseLinkedInput = {
  receivableMovementId?: string;
  payableMovementId?: string;
  operatorId: string;
  reason: string;
};

@Injectable()
export class CashFlowLedgerService {
  async resolveDefaultBankAccountId(
    tx: Prisma.TransactionClient,
    bankAccountId?: string | null,
  ): Promise<string> {
    if (bankAccountId) {
      const existing = await tx.bankAccount.findFirst({
        where: { id: bankAccountId, active: true },
        select: { id: true },
      });
      if (existing) return existing.id;
    }

    const cx = await tx.bankAccount.findFirst({
      where: { code: 'CX-GERAL', active: true },
      select: { id: true },
    });
    if (cx) return cx.id;

    const first = await tx.bankAccount.findFirst({
      where: { active: true },
      orderBy: { code: 'asc' },
      select: { id: true },
    });
    if (!first) {
      throw new CashFlowValidationError(
        'Nenhuma conta bancária ativa disponível.',
        'NO_BANK_ACCOUNT',
      );
    }
    return first.id;
  }

  async recordFromReceivableReceipt(
    tx: Prisma.TransactionClient,
    input: LedgerReceiptInput,
  ) {
    const existing = await tx.cashFlowMovement.findUnique({
      where: { receivableMovementId: input.receivableMovementId },
    });
    if (existing) return existing;

    if (input.idempotencyKey) {
      const byKey = await tx.cashFlowMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (byKey) return byKey;
    }

    const amount = roundMoney(input.amount);
    if (amount <= 0) {
      throw new CashFlowValidationError(
        'Valor de recebimento inválido.',
        'INVALID_AMOUNT',
      );
    }

    const bankAccountId = await this.resolveDefaultBankAccountId(
      tx,
      input.bankAccountId,
    );

    const movement = await tx.cashFlowMovement.create({
      data: {
        direction: 'IN' satisfies CashFlowDirection,
        kind: 'RECEIPT' satisfies CashFlowKind,
        status: 'REALIZED',
        amount,
        occurredAt: toUtcDateOnly(input.occurredAt),
        description: input.description.trim() || 'Recebimento',
        bankAccountId,
        categoryId: input.categoryId || null,
        costCenterId: input.costCenterId || null,
        origin: 'RECEIVABLE' satisfies CashFlowOrigin,
        originRef: input.originRef || null,
        receivableMovementId: input.receivableMovementId,
        notes: input.notes?.trim() || null,
        operatorId: input.operatorId,
        idempotencyKey: input.idempotencyKey || null,
      },
    });

    await tx.cashFlowAuditLog.create({
      data: {
        movementId: movement.id,
        actorId: input.operatorId,
        action: 'RECEIPT_FROM_RECEIVABLE',
        amount,
        message: 'Entrada gerada a partir de recebimento.',
      },
    });

    return movement;
  }

  async recordFromPayablePayment(
    tx: Prisma.TransactionClient,
    input: LedgerPaymentInput,
  ) {
    const existing = await tx.cashFlowMovement.findUnique({
      where: { payableMovementId: input.payableMovementId },
    });
    if (existing) return existing;

    if (input.idempotencyKey) {
      const byKey = await tx.cashFlowMovement.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
      });
      if (byKey) return byKey;
    }

    const amount = roundMoney(input.amount);
    if (amount <= 0) {
      throw new CashFlowValidationError(
        'Valor de pagamento inválido.',
        'INVALID_AMOUNT',
      );
    }

    const bankAccountId = await this.resolveDefaultBankAccountId(
      tx,
      input.bankAccountId,
    );

    const movement = await tx.cashFlowMovement.create({
      data: {
        direction: 'OUT' satisfies CashFlowDirection,
        kind: 'PAYMENT' satisfies CashFlowKind,
        status: 'REALIZED',
        amount,
        occurredAt: toUtcDateOnly(input.occurredAt),
        description: input.description.trim() || 'Pagamento',
        bankAccountId,
        categoryId: input.categoryId || null,
        costCenterId: input.costCenterId || null,
        origin: 'PAYABLE' satisfies CashFlowOrigin,
        originRef: input.originRef || null,
        payableMovementId: input.payableMovementId,
        notes: input.notes?.trim() || null,
        operatorId: input.operatorId,
        idempotencyKey: input.idempotencyKey || null,
      },
    });

    await tx.cashFlowAuditLog.create({
      data: {
        movementId: movement.id,
        actorId: input.operatorId,
        action: 'PAYMENT_FROM_PAYABLE',
        amount,
        message: 'Saída gerada a partir de pagamento.',
      },
    });

    return movement;
  }

  async reverseLinkedMovement(
    tx: Prisma.TransactionClient,
    input: ReverseLinkedInput,
  ) {
    if (!input.receivableMovementId && !input.payableMovementId) {
      throw new CashFlowValidationError(
        'Informe o movimento de origem para estorno.',
        'LINK_REQUIRED',
      );
    }
    if (!input.reason?.trim()) {
      throw new CashFlowValidationError(
        'Informe o motivo do estorno.',
        'REASON_REQUIRED',
      );
    }

    const linked = await tx.cashFlowMovement.findFirst({
      where: input.receivableMovementId
        ? { receivableMovementId: input.receivableMovementId }
        : { payableMovementId: input.payableMovementId },
    });

    if (!linked) {
      return null;
    }

    if (linked.status === 'REVERSED' || linked.status === 'CANCELLED') {
      return linked;
    }
    if (linked.status !== 'REALIZED') {
      throw new CashFlowValidationError(
        'Movimentação não pode ser estornada neste status.',
        'INVALID_STATUS',
      );
    }

    const updated = await tx.cashFlowMovement.update({
      where: { id: linked.id },
      data: { status: 'REVERSED' },
    });

    await tx.cashFlowAuditLog.create({
      data: {
        movementId: linked.id,
        actorId: input.operatorId,
        action: 'REVERSE',
        amount: dec(linked.amount),
        message: input.reason.trim(),
      },
    });

    return updated;
  }

  async assertMovementRealized(tx: Prisma.TransactionClient, id: string) {
    const row = await tx.cashFlowMovement.findUnique({ where: { id } });
    if (!row) throw new CashFlowNotFoundError();
    if (row.status !== 'REALIZED') {
      throw new CashFlowValidationError(
        'Movimentação não está realizada.',
        'INVALID_STATUS',
      );
    }
    return row;
  }
}
