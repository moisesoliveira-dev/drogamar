import { randomUUID } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  StockItemDuplicateBarcodeError,
  StockItemDuplicateCodeError,
  StockItemDuplicateSkuError,
  StockItemValidationError,
} from '../../domain/errors';
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
import { CreateStockItemCommand } from '../commands/stock-item.commands';
import { toStockItemDto } from '../dto/stock-item.dto';
import {
  assertNonNegative,
  normalizeOptionalText,
} from '../helpers/normalize';

@Injectable()
export class CreateStockItemHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
    @Inject(STOCK_EVENT_BUS)
    private readonly events: StockEventBus,
  ) {}

  async execute(command: CreateStockItemCommand) {
    const input = command.input;
    const description = input.description?.trim();
    if (!description) {
      throw new StockItemValidationError('Descrição é obrigatória.');
    }

    let code = normalizeOptionalText(input.code);
    if (!code) {
      code = await this.items.nextCode();
    }

    const sku = normalizeOptionalText(input.sku);
    const barcode = normalizeOptionalText(input.barcode);

    if (await this.items.existsByCode(code)) {
      throw new StockItemDuplicateCodeError();
    }
    if (sku && (await this.items.existsBySku(sku))) {
      throw new StockItemDuplicateSkuError();
    }
    if (barcode && (await this.items.existsByBarcode(barcode))) {
      throw new StockItemDuplicateBarcodeError();
    }

    const trackStock = input.trackStock ?? true;
    const initialStock = input.initialStock ?? 0;
    assertNonNegative('Estoque mínimo', input.minStock);
    assertNonNegative('Estoque máximo', input.maxStock);
    assertNonNegative('Estoque inicial', initialStock);
    assertNonNegative('Preço de custo', input.costPrice);
    assertNonNegative('Preço de venda', input.salePrice);

    if (
      input.minStock != null &&
      input.maxStock != null &&
      input.minStock > input.maxStock
    ) {
      throw new StockItemValidationError(
        'Estoque mínimo não pode ser maior que o máximo.',
      );
    }

    const item = StockItem.create({
      id: randomUUID(),
      code,
      description,
      sku,
      barcode,
      status: input.status ?? 'ACTIVE',
      itemType: input.itemType ?? 'PRODUCT',
      categoryId: normalizeOptionalText(input.categoryId),
      brandId: normalizeOptionalText(input.brandId),
      locationId: normalizeOptionalText(input.locationId),
      measureUnitId: normalizeOptionalText(input.measureUnitId),
      purchaseUnitId: normalizeOptionalText(input.purchaseUnitId),
      saleUnitId: normalizeOptionalText(input.saleUnitId),
      purchaseToMeasureFactor: input.purchaseToMeasureFactor ?? null,
      saleToMeasureFactor: input.saleToMeasureFactor ?? null,
      trackStock,
      minStock: trackStock ? (input.minStock ?? null) : null,
      maxStock: trackStock ? (input.maxStock ?? null) : null,
      currentStock: trackStock ? initialStock : 0,
      trackLot: input.trackLot ?? false,
      trackExpiry: input.trackExpiry ?? false,
      costPrice: input.costPrice ?? null,
      salePrice: input.salePrice ?? null,
      ncm: normalizeOptionalText(input.ncm),
      cest: normalizeOptionalText(input.cest),
      origin: normalizeOptionalText(input.origin),
      defaultCfop: normalizeOptionalText(input.defaultCfop),
      fiscalUnit: normalizeOptionalText(input.fiscalUnit),
      complementaryDescription: normalizeOptionalText(
        input.complementaryDescription,
      ),
      notes: normalizeOptionalText(input.notes),
      manufacturer: normalizeOptionalText(input.manufacturer),
      mainSupplier: normalizeOptionalText(input.mainSupplier),
    });

    await this.items.save(item);
    await this.events.publish(
      new StockItemCreated({ itemId: item.id, code: item.code }),
    );

    const loaded = await this.items.findByIdWithRelations(item.id);
    return toStockItemDto(loaded!.item, loaded!.relations);
  }
}
