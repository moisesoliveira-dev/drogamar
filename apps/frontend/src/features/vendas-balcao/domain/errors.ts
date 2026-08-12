import { mapCarrinhoError } from '../../vendas-carrinho'

export class BalcaoNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'BalcaoNetworkError'
  }
}

export class BalcaoServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'BalcaoServiceError'
    this.code = code
  }
}

export function mapBalcaoError(error: unknown): string {
  if (error instanceof BalcaoNetworkError) return error.message
  if (error instanceof BalcaoServiceError) {
    if (error.code === 'CASH_SESSION_REQUIRED') {
      return 'Abra o caixa para iniciar vendas.'
    }
    return error.message
  }
  return mapCarrinhoError(error)
}
