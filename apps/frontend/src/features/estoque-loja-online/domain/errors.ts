export class LojaNetworkError extends Error {
  constructor() {
    super('Não foi possível conectar ao servidor.')
    this.name = 'LojaNetworkError'
  }
}

export class LojaServiceError extends Error {
  readonly code?: string
  readonly pendings?: Array<{ code: string; message: string; fixPath?: string }>
  constructor(
    message?: string,
    code?: string,
    pendings?: Array<{ code: string; message: string; fixPath?: string }>,
  ) {
    super(message ?? 'Não foi possível concluir a operação.')
    this.name = 'LojaServiceError'
    this.code = code
    this.pendings = pendings
  }
}

export function mapLojaError(error: unknown): string {
  if (error instanceof LojaNetworkError) return error.message
  if (error instanceof LojaServiceError) return error.message
  return 'Não foi possível concluir a operação.'
}
