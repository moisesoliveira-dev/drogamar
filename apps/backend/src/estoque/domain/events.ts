export type DomainEvent = {
  name: string;
  occurredAt: Date;
  payload: Record<string, unknown>;
};

export class StockItemCreated {
  readonly name = 'StockItemCreated';
  constructor(
    readonly payload: { itemId: string; code: string },
    readonly occurredAt = new Date(),
  ) {}
}

export class StockItemUpdated {
  readonly name = 'StockItemUpdated';
  constructor(
    readonly payload: { itemId: string; code: string },
    readonly occurredAt = new Date(),
  ) {}
}

export class StockItemDeactivated {
  readonly name = 'StockItemDeactivated';
  constructor(
    readonly payload: { itemId: string; code: string },
    readonly occurredAt = new Date(),
  ) {}
}

export class StockItemActivated {
  readonly name = 'StockItemActivated';
  constructor(
    readonly payload: { itemId: string; code: string },
    readonly occurredAt = new Date(),
  ) {}
}

export class StockItemDeleted {
  readonly name = 'StockItemDeleted';
  constructor(
    readonly payload: { itemId: string; code: string },
    readonly occurredAt = new Date(),
  ) {}
}

export type StockDomainEvent =
  | StockItemCreated
  | StockItemUpdated
  | StockItemDeactivated
  | StockItemActivated
  | StockItemDeleted;
