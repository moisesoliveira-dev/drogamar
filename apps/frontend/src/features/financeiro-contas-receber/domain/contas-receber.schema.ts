import { z } from 'zod'

export const contasReceberConfig = {
  basePath: '/api/financeiro/contas-receber',
  lookupsPath: '/api/financeiro/contas-receber/lookups',
  dashboardPath: '/api/financeiro/contas-receber/dashboard',
  customersPath: '/api/financeiro/contas-receber/clientes',
  itemPath: (id: string) => `/api/financeiro/contas-receber/${id}`,
  receivePath: (id: string) => `/api/financeiro/contas-receber/${id}/receber`,
  reversePath: (id: string, movementId: string) =>
    `/api/financeiro/contas-receber/${id}/movimentos/${movementId}/estornar`,
  renegotiatePath: (id: string) =>
    `/api/financeiro/contas-receber/${id}/renegociar`,
  cancelPath: (id: string) => `/api/financeiro/contas-receber/${id}/cancelar`,
  cobrancasPath: '/app/financeiro/cobrancas',
} as const

export const DISPLAY_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  DUE_TODAY: 'Vencendo hoje',
  OVERDUE: 'Vencida',
  PARTIAL: 'Parcialmente recebida',
  SETTLED: 'Recebida',
  CANCELLED: 'Cancelada',
  RENEGOTIATED: 'Renegociada',
}

export function badgeVariantForReceivableStatus(status: string) {
  if (status === 'SETTLED') return 'success' as const
  if (status === 'OVERDUE') return 'danger' as const
  if (status === 'DUE_TODAY' || status === 'PARTIAL') return 'warn' as const
  if (status === 'CANCELLED' || status === 'RENEGOTIATED') return 'neutral' as const
  return 'info' as const
}

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

const customerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  document: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
})

export const receivableListItemSchema = z.object({
  id: z.string(),
  sequentialId: z.number(),
  number: z.string(),
  customer: customerSchema,
  document: z.string().nullable(),
  origin: z.string(),
  originRef: z.string().nullable(),
  description: z.string(),
  installmentLabel: z.string(),
  installmentCount: z.number(),
  dueDate: z.string(),
  issueDate: z.string(),
  originalAmount: z.number(),
  discountAmount: z.number(),
  interestAmount: z.number(),
  fineAmount: z.number(),
  updatedAmount: z.number(),
  paidAmount: z.number(),
  balance: z.number(),
  status: z.string(),
  displayStatus: z.string(),
  overdueDays: z.number(),
  paymentMethodLabel: z.string().nullable(),
})

export const receivableListSchema = z.object({
  items: z.array(receivableListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const dashboardSchema = z.object({
  totalOpen: z.number(),
  dueToday: z.number(),
  overdue: z.number(),
  receivedInPeriod: z.number(),
  expectedInPeriod: z.number(),
})

export const lookupsSchema = z.object({
  paymentMethods: z.array(
    z.object({ id: z.string(), code: z.string(), label: z.string() }),
  ),
  bankAccounts: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      bankName: z.string().nullable().optional(),
    }),
  ),
  costCenters: z.array(
    z.object({ id: z.string(), code: z.string(), name: z.string() }),
  ),
  operatorDiscountLimitPercent: z.number(),
})

export const receivableDetailSchema = receivableListItemSchema.extend({
  notes: z.string().nullable().optional(),
  paymentMethod: z
    .object({ id: z.string(), label: z.string() })
    .nullable()
    .optional(),
  bankAccount: z
    .object({ id: z.string(), name: z.string(), code: z.string() })
    .nullable()
    .optional(),
  costCenter: z
    .object({ id: z.string(), name: z.string() })
    .nullable()
    .optional(),
  createdBy: z
    .object({ id: z.string(), name: z.string(), email: z.string() })
    .optional(),
  renegotiatedFromId: z.string().nullable().optional(),
  installments: z.array(
    z.object({
      id: z.string(),
      number: z.number(),
      label: z.string(),
      dueDate: z.string(),
      amount: z.number(),
      paidAmount: z.number(),
      balance: z.number(),
      status: z.string(),
      displayStatus: z.string(),
    }),
  ),
  movements: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      amount: z.number(),
      paidAt: z.string(),
      paymentMethodLabel: z.string().nullable(),
      bankAccountName: z.string().nullable(),
      interestAmount: z.number(),
      fineAmount: z.number(),
      discountAmount: z.number(),
      notes: z.string().nullable(),
      operatorName: z.string(),
      reversesMovementId: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  history: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      amount: z.number().nullable(),
      message: z.string().nullable(),
      actorName: z.string(),
      createdAt: z.string(),
    }),
  ),
  operatorDiscountLimitPercent: z.number().optional(),
})

export type ReceivableListItem = z.infer<typeof receivableListItemSchema>
export type ReceivableDetail = z.infer<typeof receivableDetailSchema>
export type ReceivableDashboard = z.infer<typeof dashboardSchema>
export type ReceivableLookups = z.infer<typeof lookupsSchema>
