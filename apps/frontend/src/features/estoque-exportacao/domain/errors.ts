export class ExportNetworkError extends Error {
  constructor() {
    super('Não foi possível conectar ao servidor.')
    this.name = 'ExportNetworkError'
  }
}

export class ExportServiceError extends Error {
  readonly code?: string
  constructor(message?: string, code?: string) {
    super(message ?? 'Não foi possível gerar o arquivo. Tente novamente.')
    this.name = 'ExportServiceError'
    this.code = code
  }
}

export class ExportValidationClientError extends Error {
  constructor(message = 'Revise as opções selecionadas antes de gerar o arquivo.') {
    super(message)
    this.name = 'ExportValidationClientError'
  }
}

export class ExportPermissionClientError extends Error {
  constructor(
    message = 'Você não possui permissão para exportar esses dados.',
  ) {
    super(message)
    this.name = 'ExportPermissionClientError'
  }
}

export class ExportLimitClientError extends Error {
  constructor(
    message = 'A quantidade de dados selecionada é muito grande. Ajuste os filtros e tente novamente.',
  ) {
    super(message)
    this.name = 'ExportLimitClientError'
  }
}

export function mapExportErrorMessage(error: unknown): string {
  if (error instanceof ExportNetworkError) return error.message
  if (error instanceof ExportPermissionClientError) return error.message
  if (error instanceof ExportLimitClientError) return error.message
  if (error instanceof ExportValidationClientError) return error.message
  if (error instanceof ExportServiceError) return error.message
  return 'Não foi possível gerar o arquivo. Tente novamente.'
}
