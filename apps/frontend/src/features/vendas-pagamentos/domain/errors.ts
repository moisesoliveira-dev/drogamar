import { mapPaymentErrorMessage } from './pagamento.schema'

export class PagamentoNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'PagamentoNetworkError'
  }
}

export class PagamentoServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'PagamentoServiceError'
    this.code = code
  }
}

export function mapPagamentoError(error: unknown): string {
  if (error instanceof PagamentoNetworkError) return error.message
  if (error instanceof PagamentoServiceError) {
    return mapPaymentErrorMessage(error.code, error.message)
  }
  if (error instanceof Error) return error.message
  return 'Não foi possível processar o pagamento.'
}
