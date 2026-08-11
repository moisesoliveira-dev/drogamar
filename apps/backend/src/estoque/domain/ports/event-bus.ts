import type { StockDomainEvent } from '../events';

export const STOCK_EVENT_BUS = Symbol('STOCK_EVENT_BUS');

export interface StockEventBus {
  publish(event: StockDomainEvent): Promise<void>;
}
