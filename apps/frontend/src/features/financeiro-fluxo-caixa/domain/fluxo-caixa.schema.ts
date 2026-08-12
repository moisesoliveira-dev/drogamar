import { z } from 'zod'

export const fluxoCaixaConfig = {
  basePath: '/api/financeiro/fluxo-caixa',
  lookupsPath: '/api/financeiro/fluxo-caixa/lookups',
  dashboardPath: '/api/financeiro/fluxo-caixa/dashboard',
  seriesPath: '/api/financeiro/fluxo-caixa/series',
  projectionPath: '/api/financeiro/fluxo-caixa/projection',
  movementsPath: '/api/financeiro/fluxo-caixa/movements',
  movementPath: (id: string) => `/api/financeiro/fluxo-caixa/movements/${id}`,
  cancelPath: (id: string) =>
    `/api/financeiro/fluxo-caixa/movements/${id}/cancelar`,
  reversePath: (id: string) =>
    `/api/financeiro/fluxo-caixa/movements/${id}/estornar`,
  transferPath: '/api/financeiro/fluxo-caixa/transferencias',
  analysisPath: '/api/financeiro/fluxo-caixa/analysis/categories',
  balancesPath: '/api/financeiro/fluxo-caixa/balances/accounts',
} as const

export const PAGE_DESCRIPTION =
  'Acompanhe as entradas, saídas e projeções financeiras da empresa.'

export const DIRECTION_LABELS: Record<string, string> = {
  IN: 'Entrada',
  OUT: 'Saída',
}

export const KIND_LABELS: Record<string, string> = {
  RECEIPT: 'Recebimento',
  PAYMENT: 'Pagamento',
  MANUAL: 'Manual',
  TRANSFER: 'Transferência',
  ADJUSTMENT: 'Ajuste',
}

export const STATUS_LABELS: Record<string, string> = {
  REALIZED: 'Realizada',
  REVERSED: 'Estornada',
  CANCELLED: 'Cancelada',
}

export const ORIGIN_LABELS: Record<string, string> = {
  SALE: 'Venda',
  PURCHASE: 'Compra',
  RECEIVABLE: 'Contas a receber',
  PAYABLE: 'Contas a pagar',
  TRANSFER: 'Transferência',
  MANUAL: 'Manual',
  OTHER: 'Outro',
}

export const PERIOD_OPTIONS = [
  { value: 'TODAY', label: 'Hoje' },
  { value: 'LAST_7', label: 'Últimos 7 dias' },
  { value: 'MONTH', label: 'Mês atual' },
  { value: 'PREV_MONTH', label: 'Mês anterior' },
  { value: 'NEXT_7', label: 'Próximos 7 dias' },
  { value: 'NEXT_MONTH', label: 'Próximo mês' },
  { value: 'YEAR', label: 'Ano' },
  { value: 'CUSTOM', label: 'Personalizado' },
] as const

export function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDateBR(value: string | null | undefined) {
  if (!value) return '—'
  const [y, m, d] = value.slice(0, 10).split('-')
  if (!y || !m || !d) return value
  return `${d}/${m}/${y}`
}

export function formatPct(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`
}

export function badgeVariantForStatus(status: string) {
  if (status === 'REALIZED') return 'success' as const
  if (status === 'REVERSED') return 'warn' as const
  if (status === 'CANCELLED') return 'neutral' as const
  return 'info' as const
}

export function badgeVariantForDirection(direction: string) {
  return direction === 'IN' ? ('success' as const) : ('danger' as const)
}

const bankAccountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  kind: z.string().optional(),
  bankName: z.string().nullable().optional(),
})

const categorySchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  })
  .nullable()

export const lookupsSchema = z.object({
  bankAccounts: z.array(bankAccountSchema),
  categories: z.array(
    z.object({ id: z.string(), code: z.string(), name: z.string() }),
  ),
  costCenters: z.array(
    z.object({ id: z.string(), code: z.string(), name: z.string() }),
  ),
})

export const dashboardSchema = z.object({
  from: z.string(),
  to: z.string(),
  currentBalance: z.number(),
  periodInflows: z.number(),
  periodOutflows: z.number(),
  result: z.number(),
  projectedBalance: z.number(),
  openingBalance: z.number(),
  closingBalanceRealized: z.number(),
  toReceive: z.number().optional(),
  toPay: z.number().optional(),
  risk: z
    .object({
      projectedNegative: z.boolean(),
      minProjectedBalance: z.number(),
      minProjectedDate: z.string().nullable(),
    })
    .nullable(),
  comparison: z.object({
    previousInflows: z.number(),
    previousOutflows: z.number(),
    previousResult: z.number(),
    inflowsChangePct: z.number().nullable(),
    outflowsChangePct: z.number().nullable(),
    resultChangePct: z.number().nullable(),
  }),
})

export const seriesSchema = z.object({
  from: z.string(),
  to: z.string(),
  groupBy: z.string(),
  points: z.array(
    z.object({
      date: z.string(),
      inflows: z.number(),
      outflows: z.number(),
      result: z.number(),
      balanceRealized: z.number(),
      balanceProjected: z.number(),
    }),
  ),
})

export const projectionSchema = z.object({
  from: z.string(),
  to: z.string(),
  currentBalance: z.number(),
  toReceive: z.number(),
  toPay: z.number(),
  projectedBalance: z.number(),
  byDate: z.array(
    z.object({
      date: z.string(),
      inflows: z.number(),
      outflows: z.number(),
      result: z.number(),
      projectedBalance: z.number(),
    }),
  ),
  upcoming: z.array(
    z.object({
      date: z.string(),
      direction: z.string(),
      amount: z.number(),
      description: z.string(),
      origin: z.string(),
      originId: z.string(),
    }),
  ),
})

export const movementListItemSchema = z.object({
  id: z.string(),
  sequentialId: z.number(),
  number: z.string(),
  direction: z.string(),
  kind: z.string(),
  status: z.string(),
  amount: z.number(),
  occurredAt: z.string(),
  description: z.string(),
  origin: z.string(),
  originRef: z.string().nullable().optional(),
  transferGroupId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  bankAccount: bankAccountSchema,
  category: categorySchema.optional(),
  costCenter: categorySchema.optional(),
  operatorName: z.string().optional(),
  runningBalance: z.number().nullable().optional(),
})

export const movementListSchema = z.object({
  items: z.array(movementListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const movementDetailSchema = movementListItemSchema.extend({
  operator: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string().optional(),
    })
    .optional(),
  auditLogs: z
    .array(
      z.object({
        id: z.string(),
        action: z.string(),
        amount: z.number().nullable(),
        message: z.string().nullable(),
        createdAt: z.string(),
        actorName: z.string(),
      }),
    )
    .optional(),
  receivableMovementId: z.string().nullable().optional(),
  payableMovementId: z.string().nullable().optional(),
  reversesMovementId: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

export const analysisSchema = z.object({
  from: z.string(),
  to: z.string(),
  direction: z.string(),
  total: z.number(),
  items: z.array(
    z.object({
      categoryId: z.string().nullable(),
      categoryName: z.string(),
      origin: z.string(),
      amount: z.number(),
      count: z.number(),
      sharePct: z.number(),
    }),
  ),
})

export const balancesSchema = z.object({
  from: z.string(),
  to: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      kind: z.string(),
      balance: z.number(),
      inflows: z.number(),
      outflows: z.number(),
      result: z.number(),
    }),
  ),
})

export type FluxoCaixaLookups = z.infer<typeof lookupsSchema>
export type FluxoCaixaDashboard = z.infer<typeof dashboardSchema>
export type FluxoCaixaSeries = z.infer<typeof seriesSchema>
export type FluxoCaixaProjection = z.infer<typeof projectionSchema>
export type CashFlowMovementListItem = z.infer<typeof movementListItemSchema>
export type CashFlowMovementDetail = z.infer<typeof movementDetailSchema>
export type FluxoCaixaAnalysis = z.infer<typeof analysisSchema>
export type FluxoCaixaBalances = z.infer<typeof balancesSchema>
