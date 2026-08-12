import { z } from 'zod'

export const contasPagarConfig = {
  basePath: '/api/financeiro/contas-pagar',
  lookupsPath: '/api/financeiro/contas-pagar/lookups',
  dashboardPath: '/api/financeiro/contas-pagar/dashboard',
  suppliersPath: '/api/financeiro/contas-pagar/fornecedores',
  itemPath: (id: string) => `/api/financeiro/contas-pagar/${id}`,
  payPath: (id: string) => `/api/financeiro/contas-pagar/${id}/pagar`,
  reversePath: (id: string, movementId: string) =>
    `/api/financeiro/contas-pagar/${id}/movimentos/${movementId}/estornar`,
  renegotiatePath: (id: string) =>
    `/api/financeiro/contas-pagar/${id}/renegociar`,
  cancelPath: (id: string) => `/api/financeiro/contas-pagar/${id}/cancelar`,
  schedulePath: (id: string) => `/api/financeiro/contas-pagar/${id}/agendar`,
  requestApprovalPath: (id: string) =>
    `/api/financeiro/contas-pagar/${id}/solicitar-aprovacao`,
  approvePath: (id: string) => `/api/financeiro/contas-pagar/${id}/aprovar`,
  rejectPath: (id: string) => `/api/financeiro/contas-pagar/${id}/rejeitar`,
} as const

export const DISPLAY_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Em aberto',
  DUE_TODAY: 'Vencendo hoje',
  OVERDUE: 'Vencida',
  PARTIAL: 'Parcialmente paga',
  SETTLED: 'Paga',
  CANCELLED: 'Cancelada',
  RENEGOTIATED: 'Renegociada',
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  NONE: 'Sem aprovação',
  PENDING: 'Aguardando aprovação',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
}

export function badgeVariantForPayableStatus(status: string) {
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

const supplierSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  document: z.string().nullable().optional(),
  documentType: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
})

const categorySchema = z
  .object({
    id: z.string(),
    code: z.string(),
    name: z.string(),
  })
  .nullable()

export const payableListItemSchema = z.object({
  id: z.string(),
  sequentialId: z.number(),
  number: z.string(),
  supplier: supplierSchema,
  category: categorySchema.optional(),
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
  requiresApproval: z.boolean().optional(),
  approvalStatus: z.string().optional(),
})

export const payableListSchema = z.object({
  items: z.array(payableListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const dashboardSchema = z.object({
  totalOpen: z.number(),
  dueToday: z.number(),
  overdue: z.number(),
  paidInPeriod: z.number(),
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
  categories: z.array(
    z.object({ id: z.string(), code: z.string(), name: z.string() }),
  ),
  operatorDiscountLimitPercent: z.number(),
  approvalAmountThreshold: z.number().optional(),
})

export const payableDetailSchema = payableListItemSchema.extend({
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
  schedules: z
    .array(
      z.object({
        id: z.string(),
        scheduledDate: z.string(),
        amount: z.number(),
        paymentMethodId: z.string().nullable().optional(),
        bankAccountId: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.string(),
        createdAt: z.string(),
      }),
    )
    .optional(),
  approvals: z
    .array(
      z.object({
        id: z.string(),
        status: z.string(),
        amount: z.number(),
        reason: z.string().nullable().optional(),
        actorName: z.string(),
        createdAt: z.string(),
      }),
    )
    .optional(),
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
  approvalAmountThreshold: z.number().optional(),
})

export type PayableListItem = z.infer<typeof payableListItemSchema>
export type PayableDetail = z.infer<typeof payableDetailSchema>
export type PayableDashboard = z.infer<typeof dashboardSchema>
export type PayableLookups = z.infer<typeof lookupsSchema>
