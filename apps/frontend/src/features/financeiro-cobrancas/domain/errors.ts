export class CobrancasNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'CobrancasNetworkError'
  }
}

export class CobrancasServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'CobrancasServiceError'
    this.code = code
  }
}

export function mapCobrancasError(error: unknown): string {
  if (error instanceof CobrancasNetworkError) return error.message
  if (error instanceof CobrancasServiceError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a operação.'
}
