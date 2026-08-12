import { z } from 'zod'

export const cobrancasConfig = {
  basePath: '/api/financeiro/cobrancas',
  lookupsPath: '/api/financeiro/cobrancas/lookups',
  dashboardPath: '/api/financeiro/cobrancas/dashboard',
  agingPath: '/api/financeiro/cobrancas/aging',
  agendaPath: '/api/financeiro/cobrancas/agenda',
  eficienciaPath: '/api/financeiro/cobrancas/eficiencia',
  itemPath: (id: string) => `/api/financeiro/cobrancas/${id}`,
  contactPath: (id: string) => `/api/financeiro/cobrancas/${id}/contatos`,
  promisePath: (id: string) => `/api/financeiro/cobrancas/${id}/promessas`,
  cancelPromisePath: (id: string, promiseId: string) =>
    `/api/financeiro/cobrancas/${id}/promessas/${promiseId}/cancelar`,
  assignPath: (id: string) => `/api/financeiro/cobrancas/${id}/responsavel`,
  nextActionPath: (id: string) => `/api/financeiro/cobrancas/${id}/proxima-acao`,
  cancelPath: (id: string) => `/api/financeiro/cobrancas/${id}/cancelar`,
  resolvePath: (id: string) => `/api/financeiro/cobrancas/${id}/resolver`,
  acordoPath: (id: string) => `/api/financeiro/cobrancas/${id}/acordo`,
  contasReceberPath: '/app/financeiro/contas-receber',
} as const

export const PAGE_DESCRIPTION =
  'Acompanhe clientes inadimplentes, cobranças e promessas de pagamento.'

export const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  CONTACTED: 'Contatado',
  PROMISED: 'Com promessa',
  RESOLVED: 'Resolvido',
  NO_RESPONSE: 'Sem resposta',
  CANCELLED: 'Cancelado',
}

export const PERIOD_OPTIONS = [
  { value: 'TODAY', label: 'Hoje' },
  { value: 'LAST_7', label: 'Últimos 7 dias' },
  { value: 'MONTH', label: 'Mês atual' },
  { value: 'PREV_MONTH', label: 'Mês anterior' },
  { value: 'YEAR', label: 'Ano' },
] as const

export const DAYS_BUCKET_OPTIONS = [
  { value: 'ALL', label: 'Todos os dias' },
  { value: '1-7', label: '1–7 dias' },
  { value: '8-30', label: '8–30 dias' },
  { value: '31-60', label: '31–60 dias' },
  { value: '61-90', label: '61–90 dias' },
  { value: '90+', label: '90+ dias' },
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

export function badgeVariantForStatus(status: string) {
  if (status === 'RESOLVED') return 'success' as const
  if (status === 'PROMISED' || status === 'CONTACTED') return 'info' as const
  if (status === 'NO_RESPONSE' || status === 'PENDING') return 'warn' as const
  if (status === 'CANCELLED') return 'neutral' as const
  return 'info' as const
}

export function badgeVariantForPriority(score: number) {
  if (score >= 200) return 'danger' as const
  if (score >= 100) return 'warn' as const
  return 'info' as const
}

export function priorityLabel(score: number) {
  if (score >= 200) return 'Alta'
  if (score >= 100) return 'Média'
  return 'Baixa'
}

const customerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  document: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
})

const assigneeSchema = z
  .object({ id: z.string(), name: z.string() })
  .nullable()

export const caseListItemSchema = z.object({
  id: z.string(),
  sequentialId: z.number(),
  number: z.string(),
  customer: customerSchema,
  overdueAccountsCount: z.number(),
  overdueAmount: z.number(),
  maxDaysOverdue: z.number(),
  lastContactAt: z.string().nullable(),
  nextAction: z.string().nullable(),
  nextActionLabel: z.string().nullable(),
  nextActionAt: z.string().nullable(),
  status: z.string(),
  statusLabel: z.string(),
  financialStatus: z.string(),
  assignee: assigneeSchema,
  priorityScore: z.number(),
  notes: z.string().nullable().optional(),
})

export const caseListSchema = z.object({
  items: z.array(caseListItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const dashboardSchema = z.object({
  totalOverdue: z.number(),
  delinquentCustomers: z.number(),
  pendingCollections: z.number(),
  activePromises: z.number(),
  recoveredViaCollections: z.number(),
  period: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

export const agingSchema = z.object({
  buckets: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      amount: z.number(),
    }),
  ),
})

export const agendaSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      sequentialId: z.number(),
      number: z.string(),
      customer: z.object({
        id: z.string(),
        code: z.string(),
        name: z.string(),
        phone: z.string().nullable().optional(),
      }),
      status: z.string(),
      statusLabel: z.string(),
      nextAction: z.string().nullable(),
      nextActionLabel: z.string().nullable(),
      nextActionAt: z.string().nullable(),
      nextActionNotes: z.string().nullable().optional(),
      assignee: assigneeSchema,
      priorityScore: z.number(),
    }),
  ),
})

export const lookupsSchema = z.object({
  channels: z.array(z.object({ value: z.string(), label: z.string() })),
  outcomes: z.array(z.object({ value: z.string(), label: z.string() })),
  statuses: z.array(z.object({ value: z.string(), label: z.string() })),
  nextActions: z.array(z.object({ value: z.string(), label: z.string() })),
  assignees: z.array(z.object({ id: z.string(), name: z.string() })),
  messagingConfigured: z.boolean().optional(),
  messagingMessage: z.string().optional(),
})

export const caseDetailSchema = caseListItemSchema.extend({
  openedAt: z.string().optional(),
  closedAt: z.string().nullable().optional(),
  nextActionNotes: z.string().nullable().optional(),
  createdBy: z
    .object({ id: z.string(), name: z.string() })
    .optional()
    .nullable(),
  receivables: z.array(
    z.object({
      id: z.string(),
      sequentialId: z.number(),
      number: z.string(),
      description: z.string(),
      document: z.string().nullable(),
      dueDate: z.string(),
      status: z.string(),
      displayStatus: z.string(),
      overdueDays: z.number(),
      originalAmount: z.number(),
      balance: z.number(),
      paidAmount: z.number(),
      updatedAmount: z.number(),
      contasReceberPath: z.string(),
    }),
  ),
  contacts: z.array(
    z.object({
      id: z.string(),
      channel: z.string(),
      channelLabel: z.string(),
      outcome: z.string(),
      outcomeLabel: z.string(),
      contactedAt: z.string(),
      notes: z.string().nullable(),
      actor: z.object({ id: z.string(), name: z.string() }),
    }),
  ),
  promises: z.array(
    z.object({
      id: z.string(),
      promisedAmount: z.number(),
      promisedDate: z.string(),
      status: z.string(),
      notes: z.string().nullable(),
      createdBy: z.object({ id: z.string(), name: z.string() }),
      createdAt: z.string(),
    }),
  ),
  history: z.array(
    z.object({
      id: z.string(),
      action: z.string(),
      amount: z.number().nullable(),
      message: z.string().nullable(),
      actor: z.object({ id: z.string(), name: z.string() }),
      createdAt: z.string(),
    }),
  ),
  metrics: z
    .object({
      overdueAmount: z.number(),
      overdueAccountsCount: z.number(),
      maxDaysOverdue: z.number(),
      priorityScore: z.number(),
      contactsCount: z.number(),
      activePromises: z.number(),
    })
    .optional(),
  renegotiateHint: z
    .object({
      path: z.string(),
      message: z.string(),
    })
    .optional(),
})

export type CaseListItem = z.infer<typeof caseListItemSchema>
export type CaseDetail = z.infer<typeof caseDetailSchema>
export type CobrancasDashboard = z.infer<typeof dashboardSchema>
export type CobrancasLookups = z.infer<typeof lookupsSchema>
export type AgingResult = z.infer<typeof agingSchema>
export type AgendaResult = z.infer<typeof agendaSchema>
