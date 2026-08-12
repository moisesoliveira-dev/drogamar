export class CarrinhoNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'CarrinhoNetworkError'
  }
}

export class CarrinhoServiceError extends Error {
  readonly code?: string
  readonly requested?: number
  readonly limitPercent?: number
  constructor(
    message: string,
    code?: string,
    extra?: { requested?: number; limitPercent?: number },
  ) {
    super(message)
    this.name = 'CarrinhoServiceError'
    this.code = code
    this.requested = extra?.requested
    this.limitPercent = extra?.limitPercent
  }
}

export function mapCarrinhoError(error: unknown): string {
  if (error instanceof CarrinhoNetworkError) return error.message
  if (error instanceof CarrinhoServiceError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a operação.'
}
