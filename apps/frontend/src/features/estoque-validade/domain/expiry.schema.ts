import { z } from 'zod'

export const expiryStatusKindSchema = z.enum([
  'EXPIRED',
  'EXPIRES_TODAY',
  'CRITICAL',
  'WARNING',
  'REGULAR',
])

export const expiryAlertItemSchema = z.object({
  id: z.string(),
  lotNumber: z.string(),
  manufacturingDate: z.string().nullable(),
  expiryDate: z.string(),
  quantity: z.number(),
  enteredAt: z.string(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  daysRemaining: z.number(),
  statusKind: expiryStatusKindSchema,
  statusLabel: z.string(),
  valueAtRisk: z.number().nullable(),
  item: z.object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    sku: z.string().nullable(),
    barcode: z.string().nullable(),
    costPrice: z.number().nullable(),
    categoryName: z.string().nullable(),
    brandName: z.string().nullable(),
    measureUnitCode: z.string().nullable(),
  }),
})

export type ExpiryAlertItem = z.infer<typeof expiryAlertItemSchema>

export const expirySummarySchema = z.object({
  expiredCount: z.number(),
  expiresIn7Count: z.number(),
  expiresIn30Count: z.number(),
  attentionCount: z.number(),
  valueAtRisk: z.number(),
  alertWindowDays: z.number(),
})

export const expiryAlertListSchema = z.object({
  items: z.array(expiryAlertItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
  summary: expirySummarySchema,
})

export type ExpiryAlertList = z.infer<typeof expiryAlertListSchema>

export const lotDetailSchema = expiryAlertItemSchema.extend({
  item: z.object({
    id: z.string(),
    code: z.string(),
    description: z.string(),
    sku: z.string().nullable(),
    barcode: z.string().nullable(),
    costPrice: z.number().nullable(),
    categoryId: z.string().nullable().optional(),
    categoryName: z.string().nullable(),
    brandId: z.string().nullable().optional(),
    brandName: z.string().nullable(),
    measureUnitCode: z.string().nullable(),
    trackExpiry: z.boolean().optional(),
    trackLot: z.boolean().optional(),
  }),
  historyNote: z.string().optional(),
})

export type LotDetail = z.infer<typeof lotDetailSchema>

export const validadeConfig = {
  alertsPath: '/api/estoque/validade/alertas',
  lotPath: (id: string) => `/api/estoque/validade/lotes/${id}`,
  alertWindowOptions: [7, 15, 30, 60, 90] as const,
}

export function badgeVariantForStatus(
  kind: z.infer<typeof expiryStatusKindSchema>,
): 'danger' | 'warn' | 'info' | 'neutral' | 'success' {
  switch (kind) {
    case 'EXPIRED':
      return 'danger'
    case 'EXPIRES_TODAY':
    case 'CRITICAL':
      return 'warn'
    case 'WARNING':
      return 'info'
    default:
      return 'neutral'
  }
}

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDateBR(isoDate: string | null | undefined): string {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.slice(0, 10).split('-')
  if (!y || !m || !d) return isoDate
  return `${d}/${m}/${y}`
}

export const stockLookupsLiteSchema = z.object({
  categories: z.array(z.object({ id: z.string(), label: z.string() })),
  brands: z.array(z.object({ id: z.string(), label: z.string() })),
  locations: z.array(z.object({ id: z.string(), label: z.string() })),
})

export type StockLookupsLite = z.infer<typeof stockLookupsLiteSchema>
