export class CodigoBarrasNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'CodigoBarrasNetworkError'
  }
}

export class CodigoBarrasServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'CodigoBarrasServiceError'
    this.code = code
  }
}

export function mapCodigoBarrasError(error: unknown): string {
  if (error instanceof CodigoBarrasNetworkError) return error.message
  if (error instanceof CodigoBarrasServiceError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a operação.'
}
