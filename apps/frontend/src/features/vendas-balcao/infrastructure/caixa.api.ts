import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import { BalcaoNetworkError, BalcaoServiceError } from '../domain/errors'
import {
  caixaClosePreviewSchema,
  caixaStateSchema,
  vendasBalcaoConfig,
  type CaixaState,
} from '../domain/balcao.schema'

async function mapError(response: Response): Promise<never> {
  let message: string | undefined
  let code: string | undefined
  try {
    const body = (await response.json()) as {
      code?: string
      message?: string
    }
    code = body.code
    message = body.message
  } catch {
    // ignore
  }
  throw new BalcaoServiceError(
    message ?? 'Não foi possível concluir a operação do caixa.',
    code,
  )
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new BalcaoNetworkError()
    throw error
  }
}

export async function getCaixaRequest(): Promise<CaixaState> {
  const response = await request(vendasBalcaoConfig.caixaPath)
  if (!response.ok) await mapError(response)
  return caixaStateSchema.parse(await response.json())
}

export async function openCaixaRequest(body: {
  registerId?: string
  openingAmount: number
  notes?: string
}): Promise<CaixaState> {
  const response = await request(vendasBalcaoConfig.openPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return caixaStateSchema.parse(await response.json())
}

export async function previewCloseCaixaRequest() {
  const response = await request(vendasBalcaoConfig.previewClosePath)
  if (!response.ok) await mapError(response)
  return caixaClosePreviewSchema.parse(await response.json())
}

export async function closeCaixaRequest(body: {
  closingAmount: number
  notes?: string
}): Promise<CaixaState> {
  const response = await request(vendasBalcaoConfig.closePath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return caixaStateSchema.parse(await response.json())
}
