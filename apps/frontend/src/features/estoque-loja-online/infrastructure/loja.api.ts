import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import { z } from 'zod'
import { LojaNetworkError, LojaServiceError } from '../domain/errors'
import {
  lojaOnlineConfig,
  overviewSchema,
  productDetailSchema,
  productListSchema,
  syncHistorySchema,
  syncJobSchema,
  type StoreOverview,
  type StoreProductDetail,
  type StoreSyncJob,
} from '../domain/loja.schema'

async function mapError(response: Response): Promise<never> {
  let pendings:
    | Array<{ code: string; message: string; fixPath?: string }>
    | undefined
  let message: string | undefined
  let code: string | undefined
  try {
    const body = (await response.json()) as {
      code?: string
      message?: string
      pendings?: Array<{ code: string; message: string; fixPath?: string }>
    }
    code = body.code
    message = body.message
    pendings = body.pendings
  } catch {
    // ignore parse errors
  }
  throw new LojaServiceError(
    message ?? 'Não foi possível concluir a operação.',
    code,
    pendings,
  )
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new LojaNetworkError()
    throw error
  }
}

export type ListProductsParams = {
  search?: string
  status?: string
  categoryId?: string
  brandId?: string
  stock?: string
  sync?: string
  publish?: string
  page?: number
  pageSize?: number
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '' || value === 'ALL') return
    q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function getOverviewRequest(): Promise<StoreOverview> {
  const response = await request(lojaOnlineConfig.overviewPath)
  if (!response.ok) await mapError(response)
  return overviewSchema.parse(await response.json())
}

export async function configureChannelRequest(body: {
  name: string
  platform?: 'GENERIC' | 'CUSTOM'
  baseUrl?: string
  credentials?: string
}): Promise<StoreOverview> {
  const response = await request(lojaOnlineConfig.channelPath, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  const data = (await response.json()) as {
    connected: boolean
    channel: StoreOverview['channel']
  }
  return {
    connected: data.connected,
    channel: data.channel,
    metrics: null,
  }
}

export async function disconnectChannelRequest(): Promise<void> {
  const response = await request(lojaOnlineConfig.disconnectPath, {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
}

export async function listProductsRequest(params: ListProductsParams) {
  const response = await request(
    `${lojaOnlineConfig.productsPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return productListSchema.parse(await response.json())
}

export async function getProductRequest(
  itemId: string,
): Promise<StoreProductDetail> {
  const response = await request(lojaOnlineConfig.productPath(itemId))
  if (!response.ok) await mapError(response)
  return productDetailSchema.parse(await response.json())
}

export async function updateProductRequest(
  itemId: string,
  body: Record<string, unknown>,
): Promise<StoreProductDetail> {
  const response = await request(lojaOnlineConfig.productPath(itemId), {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return productDetailSchema.parse(await response.json())
}

export async function publishProductRequest(itemId: string) {
  const response = await request(lojaOnlineConfig.publishPath(itemId), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return productDetailSchema.parse(await response.json())
}

export async function unpublishProductRequest(itemId: string) {
  const response = await request(lojaOnlineConfig.unpublishPath(itemId), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return productDetailSchema.parse(await response.json())
}

export async function startSyncRequest(body: {
  syncProducts: boolean
  syncStock: boolean
  syncPrices: boolean
}): Promise<StoreSyncJob> {
  const response = await request(lojaOnlineConfig.syncPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return syncJobSchema.parse(await response.json())
}

export async function listSyncJobsRequest(page = 1, pageSize = 10) {
  const response = await request(
    `${lojaOnlineConfig.syncJobsPath}?page=${page}&pageSize=${pageSize}`,
  )
  if (!response.ok) await mapError(response)
  return syncHistorySchema.parse(await response.json())
}

export async function getSyncJobRequest(id: string) {
  const response = await request(lojaOnlineConfig.syncJobPath(id))
  if (!response.ok) await mapError(response)
  return syncJobSchema.parse(await response.json())
}

const lookupOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  code: z.string().optional(),
})

const lookupsSchema = z.object({
  categories: z.array(lookupOptionSchema),
  brands: z.array(lookupOptionSchema),
  locations: z.array(lookupOptionSchema),
  units: z.array(lookupOptionSchema),
  itemTypes: z.array(z.object({ id: z.string(), label: z.string() })),
})

export type LojaLookups = z.infer<typeof lookupsSchema>

export async function getLojaLookupsRequest(): Promise<LojaLookups> {
  const response = await request('/api/estoque/lookups')
  if (!response.ok) await mapError(response)
  return lookupsSchema.parse(await response.json())
}
