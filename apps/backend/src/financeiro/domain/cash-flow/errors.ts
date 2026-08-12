export class CashFlowValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'CashFlowValidationError';
  }
}

export class CashFlowNotFoundError extends Error {
  constructor(message = 'Movimentação de caixa não encontrada.') {
    super(message);
    this.name = 'CashFlowNotFoundError';
  }
}

export class CashFlowPermissionError extends Error {
  readonly code = 'CASH_FLOW_FORBIDDEN';
  constructor(message = 'Você não possui permissão para esta operação.') {
    super(message);
    this.name = 'CashFlowPermissionError';
  }
}
