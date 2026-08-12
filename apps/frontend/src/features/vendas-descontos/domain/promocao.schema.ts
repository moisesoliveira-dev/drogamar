import { z } from 'zod'

export const vendasDescontosConfig = {
  listPath: '/api/vendas/descontos',
  dashboardPath: '/api/vendas/descontos/dashboard',
  lookupsPath: '/api/vendas/descontos/lookups',
  simulatePath: '/api/vendas/descontos/simular',
  itemPath: (id: string) => `/api/vendas/descontos/${id}`,
  activatePath: (id: string) => `/api/vendas/descontos/${id}/ativar`,
  pausePath: (id: string) => `/api/vendas/descontos/${id}/pausar`,
  cancelPath: (id: string) => `/api/vendas/descontos/${id}/cancelar`,
  approveDiscountPath: '/api/vendas/carrinho/desconto/aprovar',
} as const

export const promotionTypeSchema = z.enum([
  'PERCENT',
  'FIXED',
  'PROMO_PRICE',
  'MIN_PURCHASE',
])

export const promotionScopeSchema = z.enum([
  'ALL',
  'PRODUCTS',
  'CATEGORIES',
  'BRANDS',
])

export const promotionStackingSchema = z.enum(['STACKABLE', 'EXCLUSIVE'])

export const derivedStatusSchema = z.enum([
  'DRAFT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'CANCELLED',
])

export const permissionsSchema = z.object({
  canView: z.boolean(),
  canCreate: z.boolean(),
  canEdit: z.boolean(),
  canActivate: z.boolean(),
  canPause: z.boolean(),
  canCancel: z.boolean(),
  canDelete: z.boolean(),
  canApplyManualDiscount: z.boolean(),
  canApproveDiscount: z.boolean(),
})

export const promotionListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: promotionTypeSchema,
  scope: promotionScopeSchema,
  stacking: promotionStackingSchema,
  status: z.string(),
  derivedStatus: derivedStatusSchema,
  priority: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  productCount: z.number(),
})

export const promotionDetailSchema = promotionListItemSchema.extend({
  description: z.string().nullable(),
  percentOff: z.number().nullable(),
  amountOff: z.number().nullable(),
  promoPrice: z.number().nullable(),
  minCartValue: z.number().nullable(),
  minQuantity: z.number().nullable(),
  maxQtyPerSale: z.number().nullable(),
  targetIds: z.array(z.string()),
})

export const promotionListSchema = z.object({
  items: z.array(promotionListItemSchema),
  permissions: permissionsSchema,
})

export const dashboardSchema = z.object({
  active: z.number(),
  scheduled: z.number(),
  expiring: z.number(),
  expired: z.number(),
  promotionalProducts: z.number(),
  permissions: permissionsSchema,
})

export const lookupsSchema = z.object({
  categories: z.array(z.object({ id: z.string(), name: z.string() })),
  brands: z.array(z.object({ id: z.string(), name: z.string() })),
})

export const simulateResultSchema = z.object({
  product: z.object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    unitPrice: z.number(),
  }),
  quantity: z.number(),
  original: z.number(),
  discount: z.number(),
  final: z.number(),
  applied: z.array(
    z.object({
      promotionId: z.string(),
      name: z.string(),
      type: z.string(),
      amount: z.number(),
      lineId: z.string().nullable(),
    }),
  ),
})

export const promotionFormSchema = z
  .object({
    name: z.string().min(2, 'Informe o nome da promoção.'),
    description: z.string().optional(),
    type: promotionTypeSchema,
    scope: promotionScopeSchema,
    stacking: promotionStackingSchema,
    priority: z.coerce.number().int().min(1).max(9999),
    percentOff: z.string().optional(),
    amountOff: z.string().optional(),
    promoPrice: z.string().optional(),
    minCartValue: z.string().optional(),
    minQuantity: z.string().optional(),
    maxQtyPerSale: z.string().optional(),
    startDate: z.string().min(1, 'Informe a data inicial.'),
    startTime: z.string().min(1, 'Informe a hora inicial.'),
    endDate: z.string().min(1, 'Informe a data final.'),
    endTime: z.string().min(1, 'Informe a hora final.'),
    targetIds: z.array(z.string()),
  })
  .superRefine((value, ctx) => {
    const startsAt = combineDateTime(value.startDate, value.startTime)
    const endsAt = combineDateTime(value.endDate, value.endTime)
    if (!startsAt || !endsAt || startsAt >= endsAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'O início deve ser anterior ao fim.',
      })
    }
    if (value.scope !== 'ALL' && value.targetIds.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['targetIds'],
        message: 'Selecione ao menos um alvo.',
      })
    }
  })

export type PromotionListItem = z.infer<typeof promotionListItemSchema>
export type PromotionDetail = z.infer<typeof promotionDetailSchema>
export type PromotionFormValues = z.infer<typeof promotionFormSchema>
export type PromotionDashboard = z.infer<typeof dashboardSchema>
export type PromotionLookups = z.infer<typeof lookupsSchema>
export type SimulateResult = z.infer<typeof simulateResultSchema>
export type PromotionPermissions = z.infer<typeof permissionsSchema>

export function combineDateTime(date: string, time: string): Date | null {
  if (!date || !time) return null
  const parsed = new Date(`${date}T${time}:00`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function splitDateTime(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    return { date: '', time: '00:00' }
  }
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export function typeLabel(type: string): string {
  switch (type) {
    case 'PERCENT':
      return 'Percentual'
    case 'FIXED':
      return 'Valor fixo'
    case 'PROMO_PRICE':
      return 'Preço promocional'
    case 'MIN_PURCHASE':
      return 'Valor mínimo'
    default:
      return type
  }
}

export function scopeLabel(scope: string): string {
  switch (scope) {
    case 'ALL':
      return 'Todos os produtos'
    case 'PRODUCTS':
      return 'Produtos'
    case 'CATEGORIES':
      return 'Categorias'
    case 'BRANDS':
      return 'Marcas'
    default:
      return scope
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Rascunho'
    case 'SCHEDULED':
      return 'Agendada'
    case 'ACTIVE':
      return 'Ativa'
    case 'PAUSED':
      return 'Pausada'
    case 'EXPIRED':
      return 'Expirada'
    case 'CANCELLED':
      return 'Cancelada'
    default:
      return status
  }
}

export function statusVariant(
  status: string,
): 'neutral' | 'success' | 'warn' | 'danger' | 'info' {
  switch (status) {
    case 'ACTIVE':
      return 'success'
    case 'SCHEDULED':
      return 'info'
    case 'PAUSED':
      return 'warn'
    case 'EXPIRED':
    case 'CANCELLED':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function formatPeriod(startsAt: string, endsAt: string): string {
  const fmt = (value: string) =>
    new Date(value).toLocaleString('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  return `${fmt(startsAt)} — ${fmt(endsAt)}`
}

export function emptyPromotionForm(): PromotionFormValues {
  const now = new Date()
  const later = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const start = splitDateTime(now.toISOString())
  const end = splitDateTime(later.toISOString())
  return {
    name: '',
    description: '',
    type: 'PERCENT',
    scope: 'ALL',
    stacking: 'EXCLUSIVE',
    priority: 100,
    percentOff: '10',
    amountOff: '',
    promoPrice: '',
    minCartValue: '',
    minQuantity: '',
    maxQtyPerSale: '',
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    targetIds: [],
  }
}

export function detailToForm(detail: PromotionDetail): PromotionFormValues {
  const start = splitDateTime(detail.startsAt)
  const end = splitDateTime(detail.endsAt)
  return {
    name: detail.name,
    description: detail.description ?? '',
    type: detail.type,
    scope: detail.scope,
    stacking: detail.stacking,
    priority: detail.priority,
    percentOff: detail.percentOff == null ? '' : String(detail.percentOff),
    amountOff: detail.amountOff == null ? '' : String(detail.amountOff),
    promoPrice: detail.promoPrice == null ? '' : String(detail.promoPrice),
    minCartValue: detail.minCartValue == null ? '' : String(detail.minCartValue),
    minQuantity: detail.minQuantity == null ? '' : String(detail.minQuantity),
    maxQtyPerSale:
      detail.maxQtyPerSale == null ? '' : String(detail.maxQtyPerSale),
    startDate: start.date,
    startTime: start.time,
    endDate: end.date,
    endTime: end.time,
    targetIds: detail.targetIds,
  }
}

export function formToPayload(values: PromotionFormValues) {
  const startsAt = combineDateTime(values.startDate, values.startTime)
  const endsAt = combineDateTime(values.endDate, values.endTime)
  const num = (raw: string | undefined) => {
    if (!raw?.trim()) return null
    const n = Number(raw.replace(',', '.'))
    return Number.isFinite(n) ? n : null
  }
  return {
    name: values.name.trim(),
    description: values.description?.trim() || null,
    type: values.type,
    scope: values.scope,
    stacking: values.stacking,
    priority: values.priority,
    percentOff: num(values.percentOff),
    amountOff: num(values.amountOff),
    promoPrice: num(values.promoPrice),
    minCartValue: num(values.minCartValue),
    minQuantity: num(values.minQuantity),
    maxQtyPerSale: num(values.maxQtyPerSale),
    startsAt: startsAt?.toISOString() ?? '',
    endsAt: endsAt?.toISOString() ?? '',
    targetIds: values.scope === 'ALL' ? [] : values.targetIds,
  }
}
