import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import {
  FluxoCaixaNetworkError,
  FluxoCaixaServiceError,
} from '../domain/errors'
import {
  analysisSchema,
  balancesSchema,
  dashboardSchema,
  fluxoCaixaConfig,
  lookupsSchema,
  movementDetailSchema,
  movementListSchema,
  projectionSchema,
  seriesSchema,
  type CashFlowMovementDetail,
  type FluxoCaixaAnalysis,
  type FluxoCaixaBalances,
  type FluxoCaixaDashboard,
  type FluxoCaixaLookups,
  type FluxoCaixaProjection,
  type FluxoCaixaSeries,
} from '../domain/fluxo-caixa.schema'

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
  throw new FluxoCaixaServiceError(
    message ?? 'Não foi possível concluir a operação.',
    code,
  )
}

async function request(path: string, init?: RequestInit) {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new FluxoCaixaNetworkError()
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

export type FluxoCaixaFilterParams = {
  period?: string
  from?: string
  to?: string
  bankAccountId?: string
  categoryId?: string
  costCenterId?: string
  direction?: string
  status?: string
  origin?: string
  kind?: string
  search?: string
  page?: number
  pageSize?: number
  groupBy?: string
}

export async function getLookupsRequest(): Promise<FluxoCaixaLookups> {
  const response = await request(fluxoCaixaConfig.lookupsPath)
  if (!response.ok) await mapError(response)
  return lookupsSchema.parse(await response.json())
}

export async function getDashboardRequest(
  params: FluxoCaixaFilterParams,
): Promise<FluxoCaixaDashboard> {
  const response = await request(
    `${fluxoCaixaConfig.dashboardPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return dashboardSchema.parse(await response.json())
}

export async function getSeriesRequest(
  params: FluxoCaixaFilterParams,
): Promise<FluxoCaixaSeries> {
  const response = await request(
    `${fluxoCaixaConfig.seriesPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return seriesSchema.parse(await response.json())
}

export async function getProjectionRequest(
  params: FluxoCaixaFilterParams,
): Promise<FluxoCaixaProjection> {
  const response = await request(
    `${fluxoCaixaConfig.projectionPath}${toQuery({
      from: params.from,
      to: params.to,
      bankAccountId: params.bankAccountId,
    })}`,
  )
  if (!response.ok) await mapError(response)
  return projectionSchema.parse(await response.json())
}

export async function listMovementsRequest(params: FluxoCaixaFilterParams) {
  const response = await request(
    `${fluxoCaixaConfig.movementsPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return movementListSchema.parse(await response.json())
}

export async function getMovementRequest(
  id: string,
): Promise<CashFlowMovementDetail> {
  const response = await request(fluxoCaixaConfig.movementPath(id))
  if (!response.ok) await mapError(response)
  return movementDetailSchema.parse(await response.json())
}

export async function getAnalysisRequest(
  params: FluxoCaixaFilterParams,
): Promise<FluxoCaixaAnalysis> {
  const response = await request(
    `${fluxoCaixaConfig.analysisPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return analysisSchema.parse(await response.json())
}

export async function getBalancesRequest(
  params: FluxoCaixaFilterParams,
): Promise<FluxoCaixaBalances> {
  const response = await request(
    `${fluxoCaixaConfig.balancesPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return balancesSchema.parse(await response.json())
}

export async function createMovementRequest(body: Record<string, unknown>) {
  const response = await request(fluxoCaixaConfig.movementsPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return movementDetailSchema.parse(await response.json())
}

export async function createTransferRequest(body: Record<string, unknown>) {
  const response = await request(fluxoCaixaConfig.transferPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return movementDetailSchema.parse(await response.json())
}

export async function cancelMovementRequest(id: string, reason: string) {
  const response = await request(fluxoCaixaConfig.cancelPath(id), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return movementDetailSchema.parse(await response.json())
}

export async function reverseMovementRequest(id: string, reason: string) {
  const response = await request(fluxoCaixaConfig.reversePath(id), {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return movementDetailSchema.parse(await response.json())
}
