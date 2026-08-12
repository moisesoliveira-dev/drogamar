import { mapCarrinhoError } from '../../vendas-carrinho'

export class BuscaIaNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente a busca tradicional.') {
    super(message)
    this.name = 'BuscaIaNetworkError'
  }
}

export class BuscaIaServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'BuscaIaServiceError'
    this.code = code
  }
}

export function mapBuscaIaError(error: unknown): string {
  if (error instanceof BuscaIaNetworkError) return error.message
  if (error instanceof BuscaIaServiceError) {
    return 'Não foi possível concluir a busca por IA.'
  }
  return mapCarrinhoError(error)
}
