export class StockItemNotFoundError extends Error {
  constructor() {
    super('ITEM_NOT_FOUND');
    this.name = 'StockItemNotFoundError';
  }
}

export class StockItemDuplicateCodeError extends Error {
  constructor() {
    super('DUPLICATE_CODE');
    this.name = 'StockItemDuplicateCodeError';
  }
}

export class StockItemDuplicateSkuError extends Error {
  constructor() {
    super('DUPLICATE_SKU');
    this.name = 'StockItemDuplicateSkuError';
  }
}

export class StockItemDuplicateBarcodeError extends Error {
  constructor() {
    super('DUPLICATE_BARCODE');
    this.name = 'StockItemDuplicateBarcodeError';
  }
}

export class StockItemValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StockItemValidationError';
  }
}
