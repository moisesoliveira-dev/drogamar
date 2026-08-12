export class ReceivableValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ReceivableValidationError';
  }
}

export class ReceivableNotFoundError extends Error {
  constructor(message = 'Conta a receber não encontrada.') {
    super(message);
    this.name = 'ReceivableNotFoundError';
  }
}

export class ReceivablePermissionError extends Error {
  readonly code = 'RECEIVABLE_FORBIDDEN';
  constructor(message = 'Você não possui permissão para esta operação.') {
    super(message);
    this.name = 'ReceivablePermissionError';
  }
}
