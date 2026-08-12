import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import { PromocaoNetworkError, PromocaoServiceError } from '../domain/errors'
import {
  dashboardSchema,
  lookupsSchema,
  promotionDetailSchema,
  promotionListSchema,
  simulateResultSchema,
  vendasDescontosConfig,
  type PromotionFormValues,
  formToPayload,
} from '../domain/promocao.schema'

async function mapError(response: Response): Promise<never> {
  let message: string | undefined
  let code: string | undefined
  try {
    const body = (await response.json()) as {
      code?: string
      message?: string | { code?: string; message?: string }
    }
    const payload =
      typeof body.message === 'object' && body.message ? body.message : body
    code = payload.code ?? body.code
    message =
      typeof payload.message === 'string'
        ? payload.message
        : typeof body.message === 'string'
          ? body.message
          : undefined
  } catch {
    // ignore
  }
  throw new PromocaoServiceError(
    message ?? 'Não foi possível concluir a operação.',
    code,
  )
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new PromocaoNetworkError()
    throw error
  }
}

function toQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (!value) return
    q.set(key, value)
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function listPromocoesRequest(params: {
  search?: string
  status?: string
}) {
  const response = await request(
    `${vendasDescontosConfig.listPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return promotionListSchema.parse(await response.json())
}

export async function getDashboardRequest() {
  const response = await request(vendasDescontosConfig.dashboardPath)
  if (!response.ok) await mapError(response)
  return dashboardSchema.parse(await response.json())
}

export async function getLookupsRequest() {
  const response = await request(vendasDescontosConfig.lookupsPath)
  if (!response.ok) await mapError(response)
  return lookupsSchema.parse(await response.json())
}

export async function getPromocaoRequest(id: string) {
  const response = await request(vendasDescontosConfig.itemPath(id))
  if (!response.ok) await mapError(response)
  return promotionDetailSchema.parse(await response.json())
}

export async function createPromocaoRequest(values: PromotionFormValues) {
  const response = await request(vendasDescontosConfig.listPath, {
    method: 'POST',
    body: JSON.stringify(formToPayload(values)),
  })
  if (!response.ok) await mapError(response)
  return promotionDetailSchema.parse(await response.json())
}

export async function updatePromocaoRequest(
  id: string,
  values: PromotionFormValues,
) {
  const response = await request(vendasDescontosConfig.itemPath(id), {
    method: 'PATCH',
    body: JSON.stringify(formToPayload(values)),
  })
  if (!response.ok) await mapError(response)
  return promotionDetailSchema.parse(await response.json())
}

export async function activatePromocaoRequest(id: string) {
  const response = await request(vendasDescontosConfig.activatePath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return promotionDetailSchema.parse(await response.json())
}

export async function pausePromocaoRequest(id: string) {
  const response = await request(vendasDescontosConfig.pausePath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return promotionDetailSchema.parse(await response.json())
}

export async function cancelPromocaoRequest(id: string) {
  const response = await request(vendasDescontosConfig.cancelPath(id), {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return promotionDetailSchema.parse(await response.json())
}

export async function deletePromocaoRequest(id: string) {
  const response = await request(vendasDescontosConfig.itemPath(id), {
    method: 'DELETE',
  })
  if (!response.ok) await mapError(response)
}

export async function simulatePromocaoRequest(input: {
  stockItemId: string
  quantity: number
  promotionId?: string
}) {
  const response = await request(vendasDescontosConfig.simulatePath, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await mapError(response)
  return simulateResultSchema.parse(await response.json())
}
