import { Inject, Injectable } from '@nestjs/common';
import { StockItemNotFoundError } from '../../domain/errors';
import {
  StockItemActivated,
  StockItemDeactivated,
  StockItemDeleted,
} from '../../domain/events';
import {
  STOCK_EVENT_BUS,
  type StockEventBus,
} from '../../domain/ports/event-bus';
import {
  STOCK_ITEM_REPOSITORY,
  type StockItemRepository,
} from '../../domain/ports/stock-item.repository';
import {
  ActivateStockItemCommand,
  DeactivateStockItemCommand,
  DeleteStockItemCommand,
} from '../commands/stock-item.commands';
import { toStockItemDto } from '../dto/stock-item.dto';

@Injectable()
export class DeactivateStockItemHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
    @Inject(STOCK_EVENT_BUS)
    private readonly events: StockEventBus,
  ) {}

  async execute(command: DeactivateStockItemCommand) {
    const item = await this.items.findById(command.id);
    if (!item) throw new StockItemNotFoundError();
    const updated = item.deactivate();
    await this.items.save(updated);
    await this.events.publish(
      new StockItemDeactivated({ itemId: updated.id, code: updated.code }),
    );
    const loaded = await this.items.findByIdWithRelations(updated.id);
    return toStockItemDto(loaded!.item, loaded!.relations);
  }
}

@Injectable()
export class ActivateStockItemHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
    @Inject(STOCK_EVENT_BUS)
    private readonly events: StockEventBus,
  ) {}

  async execute(command: ActivateStockItemCommand) {
    const item = await this.items.findById(command.id);
    if (!item) throw new StockItemNotFoundError();
    const updated = item.activate();
    await this.items.save(updated);
    await this.events.publish(
      new StockItemActivated({ itemId: updated.id, code: updated.code }),
    );
    const loaded = await this.items.findByIdWithRelations(updated.id);
    return toStockItemDto(loaded!.item, loaded!.relations);
  }
}

@Injectable()
export class DeleteStockItemHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
    @Inject(STOCK_EVENT_BUS)
    private readonly events: StockEventBus,
  ) {}

  async execute(command: DeleteStockItemCommand): Promise<void> {
    const item = await this.items.findById(command.id);
    if (!item) throw new StockItemNotFoundError();
    await this.items.delete(item.id);
    await this.events.publish(
      new StockItemDeleted({ itemId: item.id, code: item.code }),
    );
  }
}
