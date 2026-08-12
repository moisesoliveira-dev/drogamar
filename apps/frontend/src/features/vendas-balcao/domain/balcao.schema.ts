import { z } from 'zod'
import { cartSchema } from '../../vendas-carrinho'

export const vendasBalcaoConfig = {
  caixaPath: '/api/vendas/caixa',
  openPath: '/api/vendas/caixa/abrir',
  previewClosePath: '/api/vendas/caixa/fechamento',
  closePath: '/api/vendas/caixa/fechar',
  paymentPath: '/app/vendas/pagamentos',
  cartPath: '/app/vendas/carrinho',
  barcodePath: '/app/vendas/codigo-barras',
  aiSearchPath: '/app/vendas/busca-ia',
  discountsPath: '/app/vendas/descontos',
} as const

export const cashRegisterSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
})

export const cashCloseSummarySchema = z.object({
  openingAmount: z.number(),
  totalSold: z.number(),
  cash: z.number(),
  pix: z.number(),
  card: z.number(),
  other: z.number(),
  sangrias: z.number(),
  suprimentos: z.number(),
  expectedAmount: z.number(),
  declaredAmount: z.number().nullable(),
  difference: z.number().nullable(),
})

export const cashSessionSchema = z.object({
  id: z.string(),
  status: z.string(),
  register: cashRegisterSchema,
  operator: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  openingAmount: z.number(),
  notes: z.string().nullable(),
  openedAt: z.string(),
  closedAt: z.string().nullable(),
  summary: cashCloseSummarySchema,
})

export const caixaStateSchema = z.object({
  open: z.boolean(),
  session: cashSessionSchema.nullable(),
  registers: z.array(cashRegisterSchema).default([]),
  summary: cashCloseSummarySchema.optional(),
})

export const caixaClosePreviewSchema = z.object({
  session: cashSessionSchema,
  summary: cashCloseSummarySchema,
})

export type CashRegister = z.infer<typeof cashRegisterSchema>
export type CashSession = z.infer<typeof cashSessionSchema>
export type CaixaState = z.infer<typeof caixaStateSchema>
export type CashCloseSummary = z.infer<typeof cashCloseSummarySchema>
export type HeldCart = z.infer<typeof cartSchema>
