import { z } from 'zod'
import { cartSchema } from '../../vendas-carrinho'

export const vendasPagamentosConfig = {
  methodsPath: '/api/vendas/pagamentos/metodos',
  sessionPath: '/api/vendas/pagamentos/sessao',
  finalizePath: '/api/vendas/pagamentos/finalizar',
  cancelPath: '/api/vendas/pagamentos/cancelar',
  receiptPath: (id: string) => `/api/vendas/pagamentos/comprovantes/${id}`,
  cartPath: '/app/vendas/carrinho',
  /** Pagamento parcial bloqueado até regra de negócio permitir. */
  allowPartialPayment: false,
} as const

export const paymentMethodSchema = z.object({
  code: z.string(),
  label: z.string(),
  supportsChange: z.boolean(),
  supportsInstallments: z.boolean(),
  requiresIntegration: z.boolean(),
  enabled: z.boolean(),
})

export const paymentSummarySchema = z.object({
  subtotal: z.number(),
  discounts: z.number(),
  surcharges: z.number(),
  total: z.number(),
  amountPaid: z.number(),
  remaining: z.number(),
  changeAmount: z.number(),
})

export const paymentSessionSchema = z.object({
  cart: cartSchema,
  methods: z.array(paymentMethodSchema),
  summary: paymentSummarySchema,
  allowPartialPayment: z.boolean(),
  allowSplitPayment: z.boolean(),
})

export const paymentReceiptLineSchema = z.object({
  id: z.string(),
  method: z.string(),
  methodLabel: z.string(),
  amount: z.number(),
  tenderedAmount: z.number().nullable(),
  changeAmount: z.number(),
  status: z.string(),
})

export const paymentReceiptSchema = z.object({
  id: z.string(),
  cartId: z.string(),
  saleNumber: z.number(),
  status: z.literal('APPROVED'),
  message: z.string(),
  closedAt: z.string(),
  operator: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  customer: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      documentType: z.enum(['CPF', 'CNPJ', 'OTHER']).nullable(),
      document: z.string().nullable(),
      phone: z.string().nullable().optional(),
    })
    .nullable(),
  totals: z.object({
    subtotal: z.number(),
    discounts: z.number(),
    surcharges: z.number(),
    total: z.number(),
    amountPaid: z.number(),
    changeAmount: z.number(),
  }),
  payments: z.array(paymentReceiptLineSchema),
  actions: z.object({
    canPrintReceipt: z.boolean(),
    canSendReceipt: z.boolean(),
    newSalePath: z.string(),
  }),
})

export type PaymentMethod = z.infer<typeof paymentMethodSchema>
export type PaymentSession = z.infer<typeof paymentSessionSchema>
export type PaymentReceipt = z.infer<typeof paymentReceiptSchema>

export type DraftPaymentLine = {
  id: string;
  method: string;
  methodLabel: string;
  amount: number;
  tenderedAmount: number | null;
  changeAmount: number;
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000
}

export function computeDraftSummary(
  totalDue: number,
  lines: DraftPaymentLine[],
) {
  const amountPaid = roundMoney(lines.reduce((s, l) => s + l.amount, 0))
  const changeAmount = roundMoney(
    lines.reduce((s, l) => s + l.changeAmount, 0),
  )
  const remaining = roundMoney(Math.max(0, totalDue - amountPaid))
  return {
    amountPaid,
    remaining,
    changeAmount,
    canComplete: remaining <= 0.0001 && amountPaid + 0.0001 >= totalDue,
  }
}

export function mapPaymentErrorMessage(code?: string, fallback?: string): string {
  switch (code) {
    case 'INCOMPLETE_PAYMENT':
      return fallback ?? 'Pagamento incompleto. Informe o valor restante.'
    case 'UNSUPPORTED_METHOD':
      return 'Forma de pagamento não disponível.'
    case 'NEGATIVE_CHANGE':
      return 'Valor recebido insuficiente.'
    case 'OVERPAYMENT':
      return 'A soma dos pagamentos excede o total da venda.'
    case 'IDEMPOTENCY_CONFLICT':
      return 'Não foi possível processar o pagamento. Tente novamente.'
    case 'INSUFFICIENT_STOCK':
      return 'Não foi possível processar o pagamento. Estoque insuficiente.'
    case 'CART_NOT_READY':
      return 'Revise o carrinho antes de pagar.'
    default:
      return fallback ?? 'Não foi possível processar o pagamento.'
  }
}
