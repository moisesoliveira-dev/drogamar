import { Inject, Injectable } from '@nestjs/common';
import {
  StockItemDuplicateBarcodeError,
  StockItemDuplicateCodeError,
  StockItemDuplicateSkuError,
  StockItemNotFoundError,
  StockItemValidationError,
} from '../../domain/errors';
import { StockItemUpdated } from '../../domain/events';
import {
  STOCK_EVENT_BUS,
  type StockEventBus,
} from '../../domain/ports/event-bus';
import {
  STOCK_ITEM_REPOSITORY,
  type StockItemRepository,
} from '../../domain/ports/stock-item.repository';
import { UpdateStockItemCommand } from '../commands/stock-item.commands';
import { toStockItemDto } from '../dto/stock-item.dto';
import {
  assertNonNegative,
  normalizeOptionalText,
} from '../helpers/normalize';

@Injectable()
export class UpdateStockItemHandler {
  constructor(
    @Inject(STOCK_ITEM_REPOSITORY)
    private readonly items: StockItemRepository,
    @Inject(STOCK_EVENT_BUS)
    private readonly events: StockEventBus,
  ) {}

  async execute(command: UpdateStockItemCommand) {
    const existing = await this.items.findById(command.id);
    if (!existing) throw new StockItemNotFoundError();

    const input = command.input;
    const description = input.description?.trim();
    if (!description) {
      throw new StockItemValidationError('Descrição é obrigatória.');
    }

    const code =
      normalizeOptionalText(input.code) ?? existing.props.code;
    const sku = normalizeOptionalText(input.sku);
    const barcode = normalizeOptionalText(input.barcode);

    if (await this.items.existsByCode(code, existing.id)) {
      throw new StockItemDuplicateCodeError();
    }
    if (sku && (await this.items.existsBySku(sku, existing.id))) {
      throw new StockItemDuplicateSkuError();
    }
    if (barcode && (await this.items.existsByBarcode(barcode, existing.id))) {
      throw new StockItemDuplicateBarcodeError();
    }

    const trackStock = input.trackStock ?? existing.props.trackStock;
    assertNonNegative('Estoque mínimo', input.minStock);
    assertNonNegative('Estoque máximo', input.maxStock);
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

    const updated = existing.withUpdates({
      code,
      description,
      sku,
      barcode,
      status: input.status ?? existing.props.status,
      itemType: input.itemType ?? existing.props.itemType,
      categoryId: normalizeOptionalText(input.categoryId),
      brandId: normalizeOptionalText(input.brandId),
      locationId: normalizeOptionalText(input.locationId),
      measureUnitId: normalizeOptionalText(input.measureUnitId),
      purchaseUnitId: normalizeOptionalText(input.purchaseUnitId),
      saleUnitId: normalizeOptionalText(input.saleUnitId),
      purchaseToMeasureFactor:
        input.purchaseToMeasureFactor ?? existing.props.purchaseToMeasureFactor,
      saleToMeasureFactor:
        input.saleToMeasureFactor ?? existing.props.saleToMeasureFactor,
      trackStock,
      minStock: trackStock ? (input.minStock ?? null) : null,
      maxStock: trackStock ? (input.maxStock ?? null) : null,
      trackLot: input.trackLot ?? existing.props.trackLot,
      trackExpiry: input.trackExpiry ?? existing.props.trackExpiry,
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

    await this.items.save(updated);
    await this.events.publish(
      new StockItemUpdated({ itemId: updated.id, code: updated.code }),
    );

    const loaded = await this.items.findByIdWithRelations(updated.id);
    return toStockItemDto(loaded!.item, loaded!.relations);
  }
}
