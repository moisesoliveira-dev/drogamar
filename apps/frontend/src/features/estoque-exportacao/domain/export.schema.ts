import { z } from 'zod'

export const estoqueExportConfig = {
  metaPath: '/api/estoque/exportacao/meta',
  previewPath: '/api/estoque/exportacao/preview',
  listPath: '/api/estoque/exportacao',
  createPath: '/api/estoque/exportacao',
  detailPath: (id: string) => `/api/estoque/exportacao/${id}`,
  downloadPath: (id: string) => `/api/estoque/exportacao/${id}/download`,
  cancelPath: (id: string) => `/api/estoque/exportacao/${id}/cancel`,
  retryPath: (id: string) => `/api/estoque/exportacao/${id}/retry`,
} as const

export const exportTypeSchema = z.enum([
  'ITEMS',
  'LOTS_EXPIRY',
  'CURRENT_STOCK',
  'CATEGORIES',
])

export const exportFormatSchema = z.enum(['XLSX', 'CSV', 'PDF'])

export const exportStatusSchema = z.enum([
  'PENDING',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
])

export const exportColumnDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string(),
  defaultSelected: z.boolean(),
  sensitive: z.boolean().optional(),
})

export const exportTypeMetaSchema = z.object({
  type: exportTypeSchema,
  label: z.string(),
  description: z.string(),
  formats: z.array(exportFormatSchema),
  columns: z.array(exportColumnDefSchema),
  sortOptions: z.array(z.object({ id: z.string(), label: z.string() })),
  defaultSortBy: z.string(),
  defaultSortDir: z.enum(['asc', 'desc']),
  filterKeys: z.array(z.string()),
})

export const exportMetaSchema = z.object({
  types: z.array(exportTypeMetaSchema),
  limits: z.object({
    maxRecords: z.number(),
    syncThreshold: z.number(),
    maxConcurrentPerUser: z.number(),
    retentionDays: z.number(),
  }),
})

export const exportJobSchema = z.object({
  id: z.string(),
  sequentialId: z.number(),
  type: exportTypeSchema,
  format: exportFormatSchema,
  status: exportStatusSchema,
  fileName: z.string(),
  recordCount: z.number().nullable(),
  fileSizeBytes: z.number().nullable(),
  filters: z.record(z.string(), z.unknown()),
  columns: z.array(z.string()),
  sortBy: z.string(),
  sortDir: z.string(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  userId: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  downloadedAt: z.string().nullable(),
  createdAt: z.string(),
  canDownload: z.boolean(),
  canCancel: z.boolean(),
  canRetry: z.boolean(),
})

export const exportHistorySchema = z.object({
  items: z.array(exportJobSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const exportPreviewSchema = z.object({
  count: z.number(),
  maxRecords: z.number(),
  willProcessAsync: z.boolean(),
  exceedsLimit: z.boolean(),
})

export type ExportType = z.infer<typeof exportTypeSchema>
export type ExportFormat = z.infer<typeof exportFormatSchema>
export type ExportStatus = z.infer<typeof exportStatusSchema>
export type ExportTypeMeta = z.infer<typeof exportTypeMetaSchema>
export type ExportMeta = z.infer<typeof exportMetaSchema>
export type ExportJob = z.infer<typeof exportJobSchema>
export type ExportHistory = z.infer<typeof exportHistorySchema>
export type ExportPreview = z.infer<typeof exportPreviewSchema>

export type ExportDraftFilters = Record<string, string | boolean | number | ''>

export const TYPE_LABELS: Record<ExportType, string> = {
  ITEMS: 'Itens do estoque',
  LOTS_EXPIRY: 'Lotes e validade',
  CURRENT_STOCK: 'Estoque atual',
  CATEGORIES: 'Categorias',
}

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  XLSX: 'Excel (.xlsx)',
  CSV: 'CSV (.csv)',
  PDF: 'PDF (.pdf)',
}

export const STATUS_LABELS: Record<ExportStatus, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluída',
  FAILED: 'Falhou',
  EXPIRED: 'Expirada',
  CANCELLED: 'Cancelada',
}
