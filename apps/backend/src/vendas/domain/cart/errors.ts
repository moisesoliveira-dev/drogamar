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
