import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CashSessionConflictError,
  CashSessionRequiredError,
  PaymentValidationError,
} from '../../domain/cart/errors';
import { calculateCashCloseSummary } from '../../domain/caixa/cash-close-summary';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

@Injectable()
export class CaixaService {
  constructor(private readonly prisma: PrismaService) {}

  async listRegisters() {
    const rows = await this.prisma.cashRegister.findMany({
      where: { active: true },
      orderBy: { code: 'asc' },
    });
    return {
      registers: rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
      })),
    };
  }

  async getCurrent(operatorId: string) {
    const session = await this.findOpenByOperator(operatorId);
    if (!session) {
      const registers = await this.listRegisters();
      return {
        open: false as const,
        session: null,
        registers: registers.registers,
      };
    }
    return {
      open: true as const,
      session: await this.mapSession(session, null),
      registers: [],
    };
  }

  async requireOpen(operatorId: string) {
    const session = await this.findOpenByOperator(operatorId);
    if (!session) throw new CashSessionRequiredError();
    return session;
  }

  async open(
    operatorId: string,
    input: { registerId?: string; openingAmount: number; notes?: string },
  ) {
    const openingAmount = input.openingAmount;
    if (!Number.isFinite(openingAmount) || openingAmount < 0) {
      throw new PaymentValidationError(
        'Informe um fundo de caixa válido.',
        'INVALID_OPENING_AMOUNT',
      );
    }

    const existing = await this.findOpenByOperator(operatorId);
    if (existing) {
      throw new CashSessionConflictError(
        'Já existe um caixa aberto para este operador.',
      );
    }

    const register = input.registerId
      ? await this.prisma.cashRegister.findFirst({
          where: { id: input.registerId, active: true },
        })
      : await this.prisma.cashRegister.findFirst({
          where: { active: true },
          orderBy: { code: 'asc' },
        });
    if (!register) {
      throw new CashSessionConflictError(
        'Nenhum caixa cadastrado.',
        'CASH_REGISTER_NOT_FOUND',
      );
    }

    const registerOpen = await this.prisma.cashSession.findFirst({
      where: { registerId: register.id, status: 'OPEN' },
    });
    if (registerOpen) {
      throw new CashSessionConflictError(
        `${register.name} já está aberto por outro operador.`,
        'REGISTER_ALREADY_OPEN',
      );
    }

    const created = await this.prisma.cashSession.create({
      data: {
        registerId: register.id,
        operatorId,
        status: 'OPEN',
        openingAmount,
        notes: input.notes?.trim() || null,
      },
      include: {
        register: true,
        operator: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      open: true as const,
      session: await this.mapSession(created, null),
    };
  }

  async previewClose(operatorId: string) {
    const session = await this.requireOpen(operatorId);
    const totals = await this.collectCloseTotals(session);
    return {
      session: await this.mapSession(session, totals.declaredAmount),
      summary: calculateCashCloseSummary(totals),
    };
  }

  async close(
    operatorId: string,
    input: { closingAmount: number; notes?: string },
  ) {
    if (!Number.isFinite(input.closingAmount) || input.closingAmount < 0) {
      throw new PaymentValidationError(
        'Informe o valor de fechamento.',
        'INVALID_CLOSING_AMOUNT',
      );
    }

    const session = await this.requireOpen(operatorId);
    const totals = await this.collectCloseTotals(session);
    totals.declaredAmount = input.closingAmount;
    const summary = calculateCashCloseSummary(totals);
    const closedAt = new Date();

    const updated = await this.prisma.cashSession.update({
      where: { id: session.id },
      data: {
        status: 'CLOSED',
        closingAmount: input.closingAmount,
        expectedAmount: summary.expectedAmount,
        difference: summary.difference,
        closingNotes: input.notes?.trim() || null,
        closedAt,
      },
      include: {
        register: true,
        operator: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      open: false as const,
      session: await this.mapSession(updated, input.closingAmount),
      summary,
    };
  }

  private async findOpenByOperator(operatorId: string) {
    return this.prisma.cashSession.findFirst({
      where: { operatorId, status: 'OPEN' },
      include: {
        register: true,
        operator: { select: { id: true, name: true, email: true } },
      },
      orderBy: { openedAt: 'desc' },
    });
  }

  private async collectCloseTotals(session: {
    id: string;
    operatorId: string;
    openedAt: Date;
    openingAmount: unknown;
  }) {
    const receipts = await this.prisma.saleReceipt.findMany({
      where: {
        operatorId: session.operatorId,
        closedAt: { gte: session.openedAt },
      },
      include: { payments: true },
    });

    let cashSales = 0;
    const pixSales = 0;
    const cardSales = 0;
    let otherSales = 0;
    for (const receipt of receipts) {
      for (const payment of receipt.payments) {
        if (payment.status !== 'CONFIRMED') continue;
        const amount = dec(payment.amount);
        if (payment.method === 'CASH') cashSales += amount;
        else otherSales += amount;
      }
    }

    const movements = await this.prisma.cashMovement.findMany({
      where: { sessionId: session.id },
    });
    let sangrias = 0;
    let suprimentos = 0;
    for (const mov of movements) {
      if (mov.type === 'SANGRIA') sangrias += dec(mov.amount);
      if (mov.type === 'SUPRIMENTO') suprimentos += dec(mov.amount);
    }

    return {
      openingAmount: dec(session.openingAmount),
      cashSales,
      pixSales,
      cardSales,
      otherSales,
      sangrias,
      suprimentos,
      declaredAmount: null as number | null,
    };
  }

  private async mapSession(
    session: {
      id: string;
      operatorId: string;
      status: string;
      openingAmount: unknown;
      closingAmount: unknown;
      expectedAmount: unknown;
      difference: unknown;
      notes: string | null;
      closingNotes: string | null;
      openedAt: Date;
      closedAt: Date | null;
      register: { id: string; code: string; name: string };
      operator: { id: string; name: string; email: string };
    },
    declaredAmount: number | null,
  ) {
    const totals = await this.collectCloseTotals(session);
    if (declaredAmount != null) totals.declaredAmount = declaredAmount;
    const summary = calculateCashCloseSummary(totals);
    return {
      id: session.id,
      status: session.status,
      register: session.register,
      operator: session.operator,
      openingAmount: dec(session.openingAmount),
      notes: session.notes,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      summary,
    };
  }
}
