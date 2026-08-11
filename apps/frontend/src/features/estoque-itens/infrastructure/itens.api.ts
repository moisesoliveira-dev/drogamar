import { apiFetch, HttpError, HttpNetworkError, readError } from '../../../shared/lib/http'
import {
  ItemConflictError,
  ItemNetworkError,
  ItemNotFoundError,
  ItemServiceError,
  ItemValidationError,
} from '../domain/errors'
import {
  estoqueConfig,
  stockItemListSchema,
  stockItemSchema,
  stockLookupsSchema,
  type StockItem,
  type StockItemList,
  type StockLookups,
} from '../domain/item.schema'

export type ListItemsParams = {
  search?: string
  status?: string
  categoryId?: string
  brandId?: string
  locationId?: string
  measureUnitId?: string
  itemType?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

async function mapError(response: Response): Promise<never> {
  const err = await readError(response)
  if (response.status === 404) throw new ItemNotFoundError()
  if (response.status === 409) {
    if (err.code === 'DUPLICATE_CODE') {
      throw new ItemConflictError('DUPLICATE_CODE', err.message ?? 'Código duplicado.')
    }
    if (err.code === 'DUPLICATE_SKU') {
      throw new ItemConflictError('DUPLICATE_SKU', err.message ?? 'SKU duplicado.')
    }
    if (err.code === 'DUPLICATE_BARCODE') {
      throw new ItemConflictError(
        'DUPLICATE_BARCODE',
        err.message ?? 'Código de barras duplicado.',
      )
    }
  }
  if (response.status === 400) {
    throw new ItemValidationError(err.message ?? 'Dados inválidos.')
  }
  throw new ItemServiceError(err.message)
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new ItemNetworkError()
    throw error
  }
}

function toQuery(params: ListItemsParams): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function listItemsRequest(
  params: ListItemsParams,
): Promise<StockItemList> {
  const response = await request(
    `${estoqueConfig.listPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  const parsed = stockItemListSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError('Resposta inválida da listagem.')
  return parsed.data
}

export async function getItemRequest(id: string): Promise<StockItem> {
  const response = await request(estoqueConfig.itemPath(id))
  if (!response.ok) await mapError(response)
  const parsed = stockItemSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError('Resposta inválida do item.')
  return parsed.data
}

export async function createItemRequest(body: unknown): Promise<StockItem> {
  const response = await request(estoqueConfig.listPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  const parsed = stockItemSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError('Resposta inválida ao criar.')
  return parsed.data
}

export async function updateItemRequest(
  id: string,
  body: unknown,
): Promise<StockItem> {
  const response = await request(estoqueConfig.itemPath(id), {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  const parsed = stockItemSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError('Resposta inválida ao atualizar.')
  return parsed.data
}

export async function duplicateItemRequest(id: string): Promise<StockItem> {
  const response = await request(estoqueConfig.duplicatePath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  const parsed = stockItemSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError()
  return parsed.data
}

export async function deactivateItemRequest(id: string): Promise<StockItem> {
  const response = await request(estoqueConfig.deactivatePath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  const parsed = stockItemSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError()
  return parsed.data
}

export async function activateItemRequest(id: string): Promise<StockItem> {
  const response = await request(estoqueConfig.activatePath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  const parsed = stockItemSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError()
  return parsed.data
}

export async function deleteItemRequest(id: string): Promise<void> {
  const response = await request(estoqueConfig.itemPath(id), {
    method: 'DELETE',
  })
  if (!response.ok && response.status !== 204) await mapError(response)
}

export async function getLookupsRequest(): Promise<StockLookups> {
  const response = await request(estoqueConfig.lookupsPath)
  if (!response.ok) await mapError(response)
  const parsed = stockLookupsSchema.safeParse(await response.json())
  if (!parsed.success) throw new ItemServiceError('Lookups inválidos.')
  return parsed.data
}

export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError
}
