import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import { BuscaIaNetworkError, BuscaIaServiceError } from '../domain/errors'
import {
  buscaIaResultSchema,
  buscaIaStatusSchema,
  vendasBuscaIaConfig,
  type BuscaIaResult,
} from '../domain/busca-ia.schema'

async function mapError(response: Response): Promise<never> {
  throw new BuscaIaServiceError(
    'Não foi possível concluir a busca por IA.',
    String(response.status),
  )
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new BuscaIaNetworkError()
    throw error
  }
}

export async function getBuscaIaStatusRequest() {
  const response = await request(vendasBuscaIaConfig.statusPath)
  if (!response.ok) await mapError(response)
  return buscaIaStatusSchema.parse(await response.json())
}

export async function searchBuscaIaRequest(input: {
  query: string
  page?: number
}): Promise<BuscaIaResult> {
  const response = await request(vendasBuscaIaConfig.searchPath, {
    method: 'POST',
    body: JSON.stringify(input),
  })
  if (!response.ok) await mapError(response)
  return buscaIaResultSchema.parse(await response.json())
}
