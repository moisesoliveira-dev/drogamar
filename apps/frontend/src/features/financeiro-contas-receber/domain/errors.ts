export class ContasReceberNetworkError extends Error {
  constructor(message = 'Falha de conexão. Tente novamente.') {
    super(message)
    this.name = 'ContasReceberNetworkError'
  }
}

export class ContasReceberServiceError extends Error {
  readonly code?: string
  constructor(message: string, code?: string) {
    super(message)
    this.name = 'ContasReceberServiceError'
    this.code = code
  }
}

export function mapContasReceberError(error: unknown): string {
  if (error instanceof ContasReceberNetworkError) return error.message
  if (error instanceof ContasReceberServiceError) return error.message
  if (error instanceof Error) return error.message
  return 'Não foi possível concluir a operação.'
}
