import { apiFetch, HttpNetworkError, readError } from '../../../shared/lib/http'
import {
  expiryAlertListSchema,
  lotDetailSchema,
  stockLookupsLiteSchema,
  validadeConfig,
  type ExpiryAlertList,
  type LotDetail,
  type StockLookupsLite,
} from '../domain/expiry.schema'

export class ValidadeNetworkError extends Error {
  constructor() {
    super('NETWORK_ERROR')
    this.name = 'ValidadeNetworkError'
  }
}

export class ValidadeServiceError extends Error {
  constructor(message = 'Não foi possível carregar os alertas de validade.') {
    super(message)
    this.name = 'ValidadeServiceError'
  }
}

export class LotNotFoundError extends Error {
  constructor() {
    super('LOT_NOT_FOUND')
    this.name = 'LotNotFoundError'
  }
}

export type ListExpiryParams = {
  alertWindowDays?: number
  status?: string
  search?: string
  categoryId?: string
  brandId?: string
  lotNumber?: string
  locationId?: string
  expiryFrom?: string
  expiryTo?: string
  onlyWithQuantity?: boolean
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

async function request(path: string, init?: RequestInit) {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new ValidadeNetworkError()
    throw error
  }
}

function toQuery(params: ListExpiryParams): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '' || value === false) return
    q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function listExpiryAlertsRequest(
  params: ListExpiryParams,
): Promise<ExpiryAlertList> {
  const response = await request(
    `${validadeConfig.alertsPath}${toQuery(params)}`,
  )
  if (!response.ok) {
    const err = await readError(response)
    throw new ValidadeServiceError(err.message)
  }
  const parsed = expiryAlertListSchema.safeParse(await response.json())
  if (!parsed.success) {
    throw new ValidadeServiceError('Resposta inválida dos alertas.')
  }
  return parsed.data
}

export async function getLotDetailRequest(
  id: string,
  alertWindowDays?: number,
): Promise<LotDetail> {
  const q =
    alertWindowDays != null ? `?alertWindowDays=${alertWindowDays}` : ''
  const response = await request(`${validadeConfig.lotPath(id)}${q}`)
  if (response.status === 404) throw new LotNotFoundError()
  if (!response.ok) {
    const err = await readError(response)
    throw new ValidadeServiceError(err.message)
  }
  const parsed = lotDetailSchema.safeParse(await response.json())
  if (!parsed.success) throw new ValidadeServiceError('Lote inválido.')
  return parsed.data
}

export async function getValidadeLookupsRequest(): Promise<StockLookupsLite> {
  const response = await request('/api/estoque/lookups')
  if (!response.ok) {
    const err = await readError(response)
    throw new ValidadeServiceError(err.message)
  }
  const parsed = stockLookupsLiteSchema.safeParse(await response.json())
  if (!parsed.success) throw new ValidadeServiceError('Lookups inválidos.')
  return parsed.data
}

export function mapValidadeError(error: unknown): string {
  if (error instanceof LotNotFoundError) return 'Lote não encontrado.'
  if (error instanceof ValidadeNetworkError) {
    return 'Falha de conexão. Verifique sua rede e tente novamente.'
  }
  if (error instanceof ValidadeServiceError) return error.message
  return 'Não foi possível carregar os alertas de validade.'
}
