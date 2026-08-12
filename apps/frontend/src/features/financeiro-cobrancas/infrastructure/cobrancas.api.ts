import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import {
  CobrancasNetworkError,
  CobrancasServiceError,
} from '../domain/errors'
import {
  agendaSchema,
  agingSchema,
  caseDetailSchema,
  caseListSchema,
  cobrancasConfig,
  dashboardSchema,
  lookupsSchema,
  type AgendaResult,
  type AgingResult,
  type CaseDetail,
  type CobrancasDashboard,
  type CobrancasLookups,
} from '../domain/cobrancas.schema'

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
  throw new CobrancasServiceError(
    message ?? 'Não foi possível concluir a operação.',
    code,
  )
}

async function request(path: string, init?: RequestInit) {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new CobrancasNetworkError()
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

export type CobrancasFilterParams = {
  search?: string
  status?: string
  financialStatus?: string
  customerId?: string
  daysBucket?: string
  amountMin?: number
  amountMax?: number
  assigneeId?: string
  period?: string
  page?: number
  pageSize?: number
}

export async function getLookupsRequest(): Promise<CobrancasLookups> {
  const response = await request(cobrancasConfig.lookupsPath)
  if (!response.ok) await mapError(response)
  return lookupsSchema.parse(await response.json())
}

export async function getDashboardRequest(
  period?: string,
): Promise<CobrancasDashboard> {
  const response = await request(
    cobrancasConfig.dashboardPath + toQuery({ period }),
  )
  if (!response.ok) await mapError(response)
  return dashboardSchema.parse(await response.json())
}

export async function getAgingRequest(): Promise<AgingResult> {
  const response = await request(cobrancasConfig.agingPath)
  if (!response.ok) await mapError(response)
  return agingSchema.parse(await response.json())
}

export async function getAgendaRequest(period?: string): Promise<AgendaResult> {
  const response = await request(
    cobrancasConfig.agendaPath + toQuery({ period: period ?? 'WEEK' }),
  )
  if (!response.ok) await mapError(response)
  return agendaSchema.parse(await response.json())
}

export async function listCasesRequest(params: CobrancasFilterParams) {
  const response = await request(cobrancasConfig.basePath + toQuery(params))
  if (!response.ok) await mapError(response)
  return caseListSchema.parse(await response.json())
}

export async function getCaseRequest(id: string): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.itemPath(id))
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function createCaseRequest(
  body: Record<string, unknown>,
): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.basePath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function registerContactRequest(
  id: string,
  body: Record<string, unknown>,
): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.contactPath(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function createPromiseRequest(
  id: string,
  body: Record<string, unknown>,
): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.promisePath(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function cancelPromiseRequest(
  id: string,
  promiseId: string,
): Promise<CaseDetail> {
  const response = await request(
    cobrancasConfig.cancelPromisePath(id, promiseId),
    { method: 'POST' },
  )
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function assignRequest(
  id: string,
  assigneeId: string | null,
): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.assignPath(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assigneeId }),
  })
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function setNextActionRequest(
  id: string,
  body: Record<string, unknown>,
): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.nextActionPath(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function cancelCaseRequest(
  id: string,
  reason: string,
): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.cancelPath(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  })
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}

export async function resolveCaseRequest(
  id: string,
  body: { force?: boolean; reason?: string | null },
): Promise<CaseDetail> {
  const response = await request(cobrancasConfig.resolvePath(id), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return caseDetailSchema.parse(await response.json())
}
