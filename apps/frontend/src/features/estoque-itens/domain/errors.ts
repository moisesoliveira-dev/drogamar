export class ItemNotFoundError extends Error {
  constructor() {
    super('ITEM_NOT_FOUND')
    this.name = 'ItemNotFoundError'
  }
}

export class ItemConflictError extends Error {
  readonly code: 'DUPLICATE_CODE' | 'DUPLICATE_SKU' | 'DUPLICATE_BARCODE'

  constructor(
    code: 'DUPLICATE_CODE' | 'DUPLICATE_SKU' | 'DUPLICATE_BARCODE',
    message: string,
  ) {
    super(message)
    this.name = 'ItemConflictError'
    this.code = code
  }
}

export class ItemValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ItemValidationError'
  }
}

export class ItemNetworkError extends Error {
  constructor() {
    super('NETWORK_ERROR')
    this.name = 'ItemNetworkError'
  }
}

export class ItemServiceError extends Error {
  constructor(message = 'Falha ao processar a solicitação.') {
    super(message)
    this.name = 'ItemServiceError'
  }
}
