import { Injectable, Logger } from '@nestjs/common';
import type { StockDomainEvent } from '../../domain/events';
import type { StockEventBus } from '../../domain/ports/event-bus';

@Injectable()
export class InMemoryStockEventBus implements StockEventBus {
  private readonly logger = new Logger('StockEventBus');

  async publish(event: StockDomainEvent): Promise<void> {
    this.logger.log(
      `${event.name} ${JSON.stringify({
        ...event.payload,
        at: event.occurredAt.toISOString(),
      })}`,
    );
  }
}
