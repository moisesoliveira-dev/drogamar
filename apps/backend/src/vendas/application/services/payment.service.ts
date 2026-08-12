import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  CartNotFoundError,
  CartValidationError,
  PaymentValidationError,
  ReceiptNotFoundError,
} from '../../domain/cart/errors';
import { listEnabledPaymentMethods } from '../../domain/payment/payment-methods';
import { settlePayments } from '../../domain/payment/payment-settlement';
import { CartService } from './cart.service';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

type FinalizePaymentInput = {
  idempotencyKey: string;
  payments: Array<{
    method: string;
    amount: number;
    tenderedAmount?: number | null;
  }>;
};

@Injectable()
export class PaymentService {
  /** Pagamento parcial bloqueado até regra F4/F6 permitir. */
  private readonly allowPartialPayment = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  listMethods() {
    return { methods: listEnabledPaymentMethods() };
  }

  /**
   * Revalida o carrinho e prepara a sessão de pagamento (CHECKOUT_PENDING).
   */
  async getSession(operatorId: string) {
    const cart = await this.cartService.validateForPayment(operatorId);
    if (!cart.paymentReady) {
      throw new CartValidationError(
        cart.issues[0]?.message ??
          'Carrinho não está pronto para pagamento. Revise os itens.',
        cart.issues[0]?.code ?? 'CART_NOT_READY',
      );
    }

    await this.prisma.saleCart.updateMany({
      where: {
        id: cart.id,
        operatorId,
        status: { in: ['OPEN', 'CHECKOUT_PENDING'] },
      },
      data: { status: 'CHECKOUT_PENDING', lastValidatedAt: new Date() },
    });

    const methods = listEnabledPaymentMethods();
    return {
      cart,
      methods,
      summary: {
        subtotal: cart.totals.subtotal,
        discounts: cart.totals.discounts,
        surcharges: cart.totals.surcharges,
        total: cart.totals.total,
        amountPaid: 0,
        remaining: cart.totals.total,
        changeAmount: 0,
      },
      allowPartialPayment: this.allowPartialPayment,
      allowSplitPayment: methods.length > 0,
    };
  }

  async cancelCheckout(operatorId: string) {
    const cart = await this.prisma.saleCart.findFirst({
      where: {
        operatorId,
        status: 'CHECKOUT_PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!cart) {
      const open = await this.cartService.getOrCreateOpenCart(operatorId);
      return { cancelled: false, cart: open };
    }

    await this.prisma.saleCart.update({
      where: { id: cart.id },
      data: { status: 'OPEN' },
    });

    return {
      cancelled: true,
      cart: await this.cartService.getOrCreateOpenCart(operatorId),
    };
  }

  async finalize(operatorId: string, input: FinalizePaymentInput) {
    const key = input.idempotencyKey?.trim();
    if (!key || key.length < 8) {
      throw new PaymentValidationError(
        'Chave de idempotência inválida.',
        'INVALID_IDEMPOTENCY_KEY',
      );
    }

    const existing = await this.prisma.saleReceipt.findUnique({
      where: { idempotencyKey: key },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
        cart: {
          include: {
            customer: true,
            operator: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (existing) {
      if (existing.operatorId !== operatorId) {
        throw new PaymentValidationError(
          'Chave de idempotência já utilizada.',
          'IDEMPOTENCY_CONFLICT',
        );
      }
      return this.mapReceipt(existing);
    }

    const validated = await this.cartService.validateForPayment(operatorId);
    if (!validated.paymentReady) {
      throw new CartValidationError(
        validated.issues[0]?.message ??
          'Não foi possível processar o pagamento. Revise o carrinho.',
        validated.issues[0]?.code ?? 'CART_NOT_READY',
      );
    }

    const settlement = settlePayments(validated.totals.total, input.payments, {
      allowPartial: this.allowPartialPayment,
    });
    if (!settlement.ok) {
      throw new PaymentValidationError(
        settlement.issue.message,
        settlement.issue.code,
      );
    }
    if (!settlement.settlement.canComplete) {
      throw new PaymentValidationError(
        `Pagamento incompleto. Restante: R$ ${settlement.settlement.remaining.toFixed(2)}.`,
        'INCOMPLETE_PAYMENT',
      );
    }

    try {
      const receipt = await this.prisma.$transaction(async (tx) => {
        const cart = await tx.saleCart.findFirst({
          where: {
            id: validated.id,
            operatorId,
            status: { in: ['OPEN', 'CHECKOUT_PENDING'] },
          },
          include: {
            items: { include: { stockItem: true } },
            customer: true,
            operator: { select: { id: true, name: true, email: true } },
          },
        });
        if (!cart) throw new CartNotFoundError();

        for (const item of cart.items) {
          const qty = dec(item.quantity);
          if (!item.stockItem.trackStock) continue;
          const updated = await tx.stockItem.updateMany({
            where: {
              id: item.stockItemId,
              status: 'ACTIVE',
              currentStock: { gte: qty },
            },
            data: {
              currentStock: { decrement: qty },
            },
          });
          if (updated.count !== 1) {
            throw new CartValidationError(
              `${item.productDescription} sem estoque suficiente.`,
              'INSUFFICIENT_STOCK',
            );
          }
        }

        const closedAt = new Date();
        await tx.saleCart.update({
          where: { id: cart.id },
          data: {
            status: 'CLOSED',
            closedAt,
            lastValidatedAt: closedAt,
          },
        });

        const created = await tx.saleReceipt.create({
          data: {
            cartId: cart.id,
            sequentialId: cart.sequentialId,
            operatorId,
            customerId: cart.customerId,
            subtotal: validated.totals.subtotal,
            discounts: validated.totals.discounts,
            surcharges: validated.totals.surcharges,
            total: validated.totals.total,
            amountPaid: settlement.settlement.amountPaid,
            changeAmount: settlement.settlement.changeAmount,
            idempotencyKey: key,
            closedAt,
            payments: {
              create: settlement.settlement.lines.map((line) => ({
                cartId: cart.id,
                method: line.method,
                amount: line.amount,
                tenderedAmount: line.tenderedAmount,
                changeAmount: line.changeAmount,
                status: 'CONFIRMED',
              })),
            },
          },
          include: {
            payments: { orderBy: { createdAt: 'asc' } },
            cart: {
              include: {
                customer: true,
                operator: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });

        return created;
      });

      return this.mapReceipt(receipt);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const raced = await this.prisma.saleReceipt.findUnique({
          where: { idempotencyKey: key },
          include: {
            payments: { orderBy: { createdAt: 'asc' } },
            cart: {
              include: {
                customer: true,
                operator: { select: { id: true, name: true, email: true } },
              },
            },
          },
        });
        if (raced && raced.operatorId === operatorId) {
          return this.mapReceipt(raced);
        }
        throw new PaymentValidationError(
          'Chave de idempotência já utilizada.',
          'IDEMPOTENCY_CONFLICT',
        );
      }
      throw error;
    }
  }

  async getReceipt(operatorId: string, receiptId: string) {
    const receipt = await this.prisma.saleReceipt.findFirst({
      where: { id: receiptId, operatorId },
      include: {
        payments: { orderBy: { createdAt: 'asc' } },
        cart: {
          include: {
            customer: true,
            operator: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
    if (!receipt) throw new ReceiptNotFoundError();
    return this.mapReceipt(receipt);
  }

  private mapReceipt(receipt: {
    id: string;
    cartId: string;
    sequentialId: number;
    operatorId: string;
    customerId: string | null;
    subtotal: unknown;
    discounts: unknown;
    surcharges: unknown;
    total: unknown;
    amountPaid: unknown;
    changeAmount: unknown;
    idempotencyKey: string;
    closedAt: Date;
    payments: Array<{
      id: string;
      method: string;
      amount: unknown;
      tenderedAmount: unknown;
      changeAmount: unknown;
      status: string;
    }>;
    cart: {
      customer: {
        id: string;
        code: string;
        name: string;
        documentType: 'CPF' | 'CNPJ' | 'OTHER' | null;
        document: string | null;
        phone: string | null;
      } | null;
      operator: { id: string; name: string; email: string };
    };
  }) {
    return {
      id: receipt.id,
      cartId: receipt.cartId,
      saleNumber: receipt.sequentialId,
      status: 'APPROVED' as const,
      message: 'Pagamento aprovado',
      closedAt: receipt.closedAt.toISOString(),
      operator: receipt.cart.operator,
      customer: receipt.cart.customer
        ? {
            id: receipt.cart.customer.id,
            code: receipt.cart.customer.code,
            name: receipt.cart.customer.name,
            documentType: receipt.cart.customer.documentType,
            document: receipt.cart.customer.document,
            phone: receipt.cart.customer.phone,
          }
        : null,
      totals: {
        subtotal: dec(receipt.subtotal),
        discounts: dec(receipt.discounts),
        surcharges: dec(receipt.surcharges),
        total: dec(receipt.total),
        amountPaid: dec(receipt.amountPaid),
        changeAmount: dec(receipt.changeAmount),
      },
      payments: receipt.payments.map((p) => ({
        id: p.id,
        method: p.method,
        methodLabel:
          listEnabledPaymentMethods().find((m) => m.code === p.method)?.label ??
          p.method,
        amount: dec(p.amount),
        tenderedAmount: p.tenderedAmount == null ? null : dec(p.tenderedAmount),
        changeAmount: dec(p.changeAmount),
        status: p.status,
      })),
      actions: {
        canPrintReceipt: true,
        canSendReceipt: false,
        newSalePath: '/app/vendas/balcao',
      },
    };
  }
}
