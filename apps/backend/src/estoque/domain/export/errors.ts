export class ExportValidationError extends Error {
  readonly code = 'EXPORT_VALIDATION';
  constructor(message: string) {
    super(message);
    this.name = 'ExportValidationError';
  }
}

export class ExportNotFoundError extends Error {
  readonly code = 'EXPORT_NOT_FOUND';
  constructor() {
    super('Exportação não encontrada.');
    this.name = 'ExportNotFoundError';
  }
}

export class ExportPermissionError extends Error {
  readonly code = 'EXPORT_FORBIDDEN';
  constructor(
    message = 'Você não possui permissão para exportar esses dados.',
  ) {
    super(message);
    this.name = 'ExportPermissionError';
  }
}

export class ExportLimitError extends Error {
  readonly code = 'EXPORT_LIMIT';
  constructor(
    message = 'A quantidade de dados selecionada é muito grande. Ajuste os filtros e tente novamente.',
  ) {
    super(message);
    this.name = 'ExportLimitError';
  }
}

export class ExportConcurrencyError extends Error {
  readonly code = 'EXPORT_CONCURRENCY';
  constructor(
    message = 'Há exportações em andamento. Aguarde a conclusão antes de iniciar outra.',
  ) {
    super(message);
    this.name = 'ExportConcurrencyError';
  }
}

export class ExportNotReadyError extends Error {
  readonly code = 'EXPORT_NOT_READY';
  constructor(message = 'O arquivo ainda não está disponível para download.') {
    super(message);
    this.name = 'ExportNotReadyError';
  }
}

export class ExportExpiredError extends Error {
  readonly code = 'EXPORT_EXPIRED';
  constructor(
    message = 'Esta exportação expirou e não pode mais ser baixada.',
  ) {
    super(message);
    this.name = 'ExportExpiredError';
  }
}
