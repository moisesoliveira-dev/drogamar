export class PayableValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PayableValidationError';
  }
}

export class PayableNotFoundError extends Error {
  constructor(message = 'Conta a pagar não encontrada.') {
    super(message);
    this.name = 'PayableNotFoundError';
  }
}

export class PayablePermissionError extends Error {
  readonly code = 'PAYABLE_FORBIDDEN';
  constructor(message = 'Você não possui permissão para esta operação.') {
    super(message);
    this.name = 'PayablePermissionError';
  }
}
