export class CartValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'CartValidationError';
  }
}

export class CartNotFoundError extends Error {
  constructor(message = 'Carrinho não encontrado.') {
    super(message);
    this.name = 'CartNotFoundError';
  }
}

export class CartItemNotFoundError extends Error {
  constructor(message = 'Item do carrinho não encontrado.') {
    super(message);
    this.name = 'CartItemNotFoundError';
  }
}

export class ProductNotFoundError extends Error {
  constructor(message = 'Produto não encontrado.') {
    super(message);
    this.name = 'ProductNotFoundError';
  }
}

export class CustomerNotFoundError extends Error {
  constructor(message = 'Cliente não encontrado.') {
    super(message);
    this.name = 'CustomerNotFoundError';
  }
}

export class PaymentValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PaymentValidationError';
  }
}

export class ReceiptNotFoundError extends Error {
  constructor(message = 'Comprovante não encontrado.') {
    super(message);
    this.name = 'ReceiptNotFoundError';
  }
}

export class CashSessionRequiredError extends Error {
  constructor(message = 'Abra o caixa para iniciar vendas.') {
    super(message);
    this.name = 'CashSessionRequiredError';
    this.code = 'CASH_SESSION_REQUIRED';
  }
  readonly code: string;
}

export class CashSessionConflictError extends Error {
  constructor(
    message: string,
    public readonly code = 'CASH_SESSION_CONFLICT',
  ) {
    super(message);
    this.name = 'CashSessionConflictError';
  }
}

export class PromotionNotFoundError extends Error {
  constructor(message = 'Promoção não encontrada.') {
    super(message);
    this.name = 'PromotionNotFoundError';
  }
}

export class PromotionValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PromotionValidationError';
  }
}

export class DiscountApprovalRequiredError extends Error {
  readonly code = 'DISCOUNT_NEEDS_APPROVAL';

  constructor(
    message: string,
    public readonly payload: {
      requested: number;
      limitPercent: number;
      itemsGross: number;
    },
  ) {
    super(message);
    this.name = 'DiscountApprovalRequiredError';
  }
}
