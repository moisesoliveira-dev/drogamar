import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import {
  ContasPagarNetworkError,
  ContasPagarServiceError,
} from '../domain/errors'
import {
  contasPagarConfig,
  dashboardSchema,
  lookupsSchema,
  payableDetailSchema,
  payableListSchema,
  type PayableDashboard,
  type PayableDetail,
  type PayableLookups,
} from '../domain/contas-pagar.schema'
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
  throw new ContasPagarServiceError(
    message ?? 'Não foi possível concluir a operação.',
    code,
  )
}

async function request(path: string, init?: RequestInit) {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new ContasPagarNetworkError()
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

export type ListPayablesParams = {
  search?: string
  status?: string
  supplierId?: string
  categoryId?: string
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

export async function getLookupsRequest(): Promise<PayableLookups> {
  const response = await request(contasPagarConfig.lookupsPath)
  if (!response.ok) await mapError(response)
  return lookupsSchema.parse(await response.json())
}

export async function getDashboardRequest(
  params: ListPayablesParams,
): Promise<PayableDashboard> {
  const response = await request(
    `${contasPagarConfig.dashboardPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return dashboardSchema.parse(await response.json())
}

export async function listPayablesRequest(params: ListPayablesParams) {
  const response = await request(
    `${contasPagarConfig.basePath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return payableListSchema.parse(await response.json())
}

export async function getPayableRequest(id: string): Promise<PayableDetail> {
  const response = await request(contasPagarConfig.itemPath(id))
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function createPayableRequest(body: Record<string, unknown>) {
  const response = await request(contasPagarConfig.basePath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function registerPaymentRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(contasPagarConfig.payPath(id), {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function reversePaymentRequest(
  id: string,
  movementId: string,
  reason: string,
) {
  const response = await request(contasPagarConfig.reversePath(id, movementId), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function renegotiateRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(contasPagarConfig.renegotiatePath(id), {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function cancelPayableRequest(id: string, reason: string) {
  const response = await request(contasPagarConfig.cancelPath(id), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function schedulePaymentRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(contasPagarConfig.schedulePath(id), {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function requestApprovalRequest(
  id: string,
  reason?: string | null,
) {
  const response = await request(contasPagarConfig.requestApprovalPath(id), {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function approvePayableRequest(
  id: string,
  reason?: string | null,
) {
  const response = await request(contasPagarConfig.approvePath(id), {
    method: 'POST',
    body: JSON.stringify({ reason: reason ?? null }),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function rejectPayableRequest(id: string, reason: string) {
  const response = await request(contasPagarConfig.rejectPath(id), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return payableDetailSchema.parse(await response.json())
}

export async function searchSuppliersRequest(search?: string) {
  const response = await request(
    `${contasPagarConfig.suppliersPath}${toQuery({ search, page: 1, pageSize: 20 })}`,
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
