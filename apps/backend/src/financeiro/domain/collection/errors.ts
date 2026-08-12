export class CollectionValidationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'CollectionValidationError';
  }
}

export class CollectionNotFoundError extends Error {
  constructor(message = 'Caso de cobrança não encontrado.') {
    super(message);
    this.name = 'CollectionNotFoundError';
  }
}

export class CollectionPermissionError extends Error {
  readonly code = 'COLLECTION_FORBIDDEN';
  constructor(message = 'Você não possui permissão para esta operação.') {
    super(message);
    this.name = 'CollectionPermissionError';
  }
}
