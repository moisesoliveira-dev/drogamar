import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import {
  CodigoBarrasNetworkError,
  CodigoBarrasServiceError,
} from '../domain/errors'
import {
  barcodeLookupResultSchema,
  vendasCodigoBarrasConfig,
  type BarcodeLookupResult,
} from '../domain/codigo-barras.schema'

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
  throw new CodigoBarrasServiceError(
    message ?? 'Não foi possível localizar o produto.',
    code,
  )
}

export async function lookupBarcodeRequest(
  code: string,
): Promise<BarcodeLookupResult> {
  const trimmed = code.trim()
  const q = new URLSearchParams({ code: trimmed })
  let response: Response
  try {
    response = await apiFetch(
      `${vendasCodigoBarrasConfig.lookupPath}?${q.toString()}`,
    )
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new CodigoBarrasNetworkError()
    throw error
  }
  if (!response.ok) await mapError(response)
  return barcodeLookupResultSchema.parse(await response.json())
}
