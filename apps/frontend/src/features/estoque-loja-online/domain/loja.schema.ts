import { z } from 'zod'

export const lojaOnlineConfig = {
  overviewPath: '/api/estoque/loja-online/overview',
  channelPath: '/api/estoque/loja-online/canal',
  disconnectPath: '/api/estoque/loja-online/canal/disconnect',
  productsPath: '/api/estoque/loja-online/produtos',
  productPath: (itemId: string) => `/api/estoque/loja-online/produtos/${itemId}`,
  publishPath: (itemId: string) =>
    `/api/estoque/loja-online/produtos/${itemId}/publish`,
  unpublishPath: (itemId: string) =>
    `/api/estoque/loja-online/produtos/${itemId}/unpublish`,
  syncPath: '/api/estoque/loja-online/sincronizar',
  syncJobsPath: '/api/estoque/loja-online/sincronizacoes',
  syncJobPath: (id: string) => `/api/estoque/loja-online/sincronizacoes/${id}`,
} as const

export const channelSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.string(),
  baseUrl: z.string().nullable(),
  connectionStatus: z.enum(['DISCONNECTED', 'CONNECTED', 'ERROR']),
  hasCredentials: z.boolean(),
  lastSyncAt: z.string().nullable(),
  lastErrorMessage: z.string().nullable(),
})

export const overviewSchema = z.object({
  connected: z.boolean(),
  channel: channelSchema.nullable(),
  metrics: z
    .object({
      publishedCount: z.number(),
      notPublishedCount: z.number(),
      syncedCount: z.number(),
      pendingCount: z.number(),
      lastSyncAt: z.string().nullable(),
      totalProducts: z.number(),
    })
    .nullable(),
})

export const productRowSchema = z.object({
  itemId: z.string(),
  code: z.string(),
  description: z.string(),
  commercialName: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  categoryName: z.string().nullable(),
  brandName: z.string().nullable(),
  measureUnitCode: z.string().nullable(),
  itemStatus: z.enum(['ACTIVE', 'INACTIVE']),
  erpSalePrice: z.number().nullable(),
  storePrice: z.number().nullable(),
  physicalStock: z.number(),
  availableStock: z.number(),
  publishedStock: z.number().nullable(),
  publishStatus: z.enum(['NOT_PUBLISHED', 'PUBLISHED', 'UNAVAILABLE']),
  syncStatus: z.enum(['SYNCED', 'PENDING', 'ERROR']).nullable(),
  integrationStatus: z.enum([
    'PUBLISHED',
    'NOT_PUBLISHED',
    'PENDING',
    'ERROR',
    'UNAVAILABLE',
  ]),
  lastSyncedAt: z.string().nullable(),
  channelName: z.string(),
  errorMessage: z.string().nullable(),
  imageUrl: z.string().nullable(),
})

export const productListSchema = z.object({
  items: z.array(productRowSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const pendingSchema = z.object({
  code: z.string(),
  message: z.string(),
  fixPath: z.string().optional(),
})

export const productDetailSchema = productRowSchema.extend({
  complementaryDescription: z.string().nullable().optional(),
  storeDescription: z.string().nullable(),
  shortDescription: z.string().nullable(),
  storeCategory: z.string().nullable(),
  tags: z.string().nullable(),
  useErpPrice: z.boolean(),
  priceOverride: z.number().nullable(),
  promoPrice: z.number().nullable(),
  promoStartsAt: z.string().nullable(),
  promoEndsAt: z.string().nullable(),
  reservedStock: z.number(),
  minStock: z.number().nullable(),
  trackExpiry: z.boolean(),
  pendings: z.array(pendingSchema),
  stockFlow: z.object({
    erpPhysical: z.number(),
    availableForSale: z.number(),
    storePublished: z.number().nullable(),
    pendingSync: z.boolean(),
  }),
})

export const syncJobSchema = z.object({
  id: z.string(),
  sequentialId: z.number(),
  syncProducts: z.boolean(),
  syncStock: z.boolean(),
  syncPrices: z.boolean(),
  status: z.string(),
  productsProcessed: z.number(),
  productsSuccess: z.number(),
  productsError: z.number(),
  stockUpdated: z.number(),
  pricesUpdated: z.number(),
  pendingCount: z.number(),
  summary: z.unknown().nullable().optional(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  userName: z.string().nullable(),
  userEmail: z.string().nullable(),
})

export const syncHistorySchema = z.object({
  items: z.array(syncJobSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export type StoreOverview = z.infer<typeof overviewSchema>
export type StoreProduct = z.infer<typeof productRowSchema>
export type StoreProductDetail = z.infer<typeof productDetailSchema>
export type StoreSyncJob = z.infer<typeof syncJobSchema>

export const INTEGRATION_STATUS_LABELS = {
  PUBLISHED: 'Publicado',
  NOT_PUBLISHED: 'Não publicado',
  PENDING: 'Pendente',
  ERROR: 'Erro',
  UNAVAILABLE: 'Indisponível',
} as const

export const SYNC_JOB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PROCESSING: 'Processando',
  COMPLETED: 'Concluída',
  COMPLETED_WITH_ERRORS: 'Concluída com erros',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
}
