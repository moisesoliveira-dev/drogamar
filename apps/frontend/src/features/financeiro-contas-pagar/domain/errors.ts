export class ContasPagarNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'ContasPagarNetworkError'
  }
}

export class ContasPagarServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ContasPagarServiceError'
    this.code = code
  }
}

export function mapContasPagarError(error: unknown): string {
  if (error instanceof ContasPagarNetworkError) return error.message
  if (error instanceof ContasPagarServiceError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a operação.'
}
