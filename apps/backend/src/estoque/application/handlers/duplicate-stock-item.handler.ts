import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StockItemNotFoundError } from '../../domain/errors';
import { StockItemCreated } from '../../domain/events';
import {
  STOCK_EVENT_BUS,
  type StockEventBus,
} from '../../domain/ports/event-bus';
import {
  STOCK_ITEM_REPOSITORY,
  type StockItemRepository,
} from '../../domain/ports/stock-item.repository';
import { StockItem } from '../../domain/stock-item';
import { DuplicateStockItemCommand } from '../commands/stock-item.commands';
import { toStockItemDto } from '../dto/stock-item.dto';

@Injectable()
export class DuplicateStockItemHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
    @Inject(STOCK_EVENT_BUS)
    private readonly events: StockEventBus,
  ) {}

  async execute(command: DuplicateStockItemCommand) {
    const source = await this.items.findById(command.id);
    if (!source) throw new StockItemNotFoundError();

    const code = await this.items.nextCode();
    const copy = StockItem.create({
      ...source.props,
      id: randomUUID(),
      code,
      sku: null,
      barcode: null,
      description: `${source.props.description} (cópia)`,
      currentStock: 0,
      status: 'ACTIVE',
    });

    await this.items.save(copy);
    await this.events.publish(
      new StockItemCreated({ itemId: copy.id, code: copy.code }),
    );

    const loaded = await this.items.findByIdWithRelations(copy.id);
    return toStockItemDto(loaded!.item, loaded!.relations);
  }
}
