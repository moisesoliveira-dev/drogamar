import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import {
  PagamentoNetworkError,
  PagamentoServiceError,
} from '../domain/errors'
import {
  paymentReceiptSchema,
  paymentSessionSchema,
  vendasPagamentosConfig,
  type PaymentReceipt,
  type PaymentSession,
} from '../domain/pagamento.schema'

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
  throw new PagamentoServiceError(
    message ?? 'Não foi possível processar o pagamento.',
    code,
  )
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new PagamentoNetworkError()
    throw error
  }
}

export async function getPaymentSessionRequest(): Promise<PaymentSession> {
  const response = await request(vendasPagamentosConfig.sessionPath)
  if (!response.ok) await mapError(response)
  return paymentSessionSchema.parse(await response.json())
}

export async function finalizePaymentRequest(body: {
  idempotencyKey: string
  payments: Array<{
    method: string
    amount: number
    tenderedAmount?: number
  }>
}): Promise<PaymentReceipt> {
  const response = await request(vendasPagamentosConfig.finalizePath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return paymentReceiptSchema.parse(await response.json())
}

export async function cancelPaymentRequest() {
  const response = await request(vendasPagamentosConfig.cancelPath, {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return response.json()
}

export async function getReceiptRequest(
  receiptId: string,
): Promise<PaymentReceipt> {
  const response = await request(
    vendasPagamentosConfig.receiptPath(receiptId),
  )
  if (!response.ok) await mapError(response)
  return paymentReceiptSchema.parse(await response.json())
}
