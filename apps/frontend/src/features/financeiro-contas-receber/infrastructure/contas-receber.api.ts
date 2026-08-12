import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import {
  ContasReceberNetworkError,
  ContasReceberServiceError,
} from '../domain/errors'
import {
  contasReceberConfig,
  dashboardSchema,
  lookupsSchema,
  receivableDetailSchema,
  receivableListSchema,
  type ReceivableDashboard,
  type ReceivableDetail,
  type ReceivableLookups,
} from '../domain/contas-receber.schema'
import { z } from 'zod'

async function mapError(response: Response): Promise<never> {
  let message: string | undefined
  let code: string | undefined
  try {
    const body = (await response.json()) as { code?: string; message?: string }
    code = body.code
    message = body.message
  } catch {
    // ignore
  }
  throw new ContasReceberServiceError(
    message ?? 'Não foi possível concluir a operação.',
    code,
  )
}

async function request(path: string, init?: RequestInit) {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new ContasReceberNetworkError()
    throw error
  }
}

function toQuery(params: Record<string, string | number | undefined>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '' || value === 'ALL') return
    q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export type ListReceivablesParams = {
  search?: string
  status?: string
  customerId?: string
  paymentMethodId?: string
  bankAccountId?: string
  costCenterId?: string
  origin?: string
  period?: string
  dueFrom?: string
  dueTo?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortDir?: 'asc' | 'desc'
}

export async function getLookupsRequest(): Promise<ReceivableLookups> {
  const response = await request(contasReceberConfig.lookupsPath)
  if (!response.ok) await mapError(response)
  return lookupsSchema.parse(await response.json())
}

export async function getDashboardRequest(
  params: ListReceivablesParams,
): Promise<ReceivableDashboard> {
  const response = await request(
    `${contasReceberConfig.dashboardPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return dashboardSchema.parse(await response.json())
}

export async function listReceivablesRequest(params: ListReceivablesParams) {
  const response = await request(
    `${contasReceberConfig.basePath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return receivableListSchema.parse(await response.json())
}

export async function getReceivableRequest(id: string): Promise<ReceivableDetail> {
  const response = await request(contasReceberConfig.itemPath(id))
  if (!response.ok) await mapError(response)
  return receivableDetailSchema.parse(await response.json())
}

export async function createReceivableRequest(body: Record<string, unknown>) {
  const response = await request(contasReceberConfig.basePath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return receivableDetailSchema.parse(await response.json())
}

export async function registerReceiptRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(contasReceberConfig.receivePath(id), {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return receivableDetailSchema.parse(await response.json())
}

export async function reverseReceiptRequest(
  id: string,
  movementId: string,
  reason: string,
) {
  const response = await request(contasReceberConfig.reversePath(id, movementId), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return receivableDetailSchema.parse(await response.json())
}

export async function renegotiateRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(contasReceberConfig.renegotiatePath(id), {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return receivableDetailSchema.parse(await response.json())
}

export async function cancelReceivableRequest(id: string, reason: string) {
  const response = await request(contasReceberConfig.cancelPath(id), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return receivableDetailSchema.parse(await response.json())
}

export async function searchCustomersRequest(search?: string) {
  const response = await request(
    `${contasReceberConfig.customersPath}${toQuery({ search, page: 1, pageSize: 20 })}`,
  )
  if (!response.ok) await mapError(response)
  return z
    .object({
      items: z.array(
        z.object({
          id: z.string(),
          code: z.string(),
          name: z.string(),
          document: z.string().nullable().optional(),
          documentType: z.string().nullable().optional(),
          phone: z.string().nullable().optional(),
        }),
      ),
    })
    .parse(await response.json())
}
