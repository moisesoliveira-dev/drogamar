export class FluxoCaixaNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'FluxoCaixaNetworkError'
  }
}

export class FluxoCaixaServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'FluxoCaixaServiceError'
    this.code = code
  }
}

export function mapFluxoCaixaError(error: unknown): string {
  if (error instanceof FluxoCaixaNetworkError) return error.message
  if (error instanceof FluxoCaixaServiceError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a operação.'
}
