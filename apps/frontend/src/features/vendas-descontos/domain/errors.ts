export class PromocaoNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'PromocaoNetworkError'
  }
}

export class PromocaoServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'PromocaoServiceError'
    this.code = code
  }
}

export function mapPromocaoError(error: unknown): string {
  if (error instanceof PromocaoNetworkError) return error.message
  if (error instanceof PromocaoServiceError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a operação.'
}
