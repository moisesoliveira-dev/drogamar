import { CreateStockItemHandler } from './create-stock-item.handler';
import {
  StockItemDuplicateCodeError,
  StockItemValidationError,
} from '../../domain/errors';
import type { StockItemRepository } from '../../domain/ports/stock-item.repository';
import type { StockEventBus } from '../../domain/ports/event-bus';
import { StockItem } from '../../domain/stock-item';
import { CreateStockItemCommand } from '../commands/stock-item.commands';

describe('CreateStockItemHandler', () => {
  const items: jest.Mocked<StockItemRepository> = {
    list: jest.fn(),
    listWithRelations: jest.fn(),
    findById: jest.fn(),
    findByIdWithRelations: jest.fn(),
    existsByCode: jest.fn(),
    existsBySku: jest.fn(),
    existsByBarcode: jest.fn(),
    nextCode: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const events: jest.Mocked<StockEventBus> = {
    publish: jest.fn(),
  };

  const handler = new CreateStockItemHandler(items, events);

  beforeEach(() => {
    jest.clearAllMocks();
    items.nextCode.mockResolvedValue('ITM-000001');
    items.existsByCode.mockResolvedValue(false);
    items.existsBySku.mockResolvedValue(false);
    items.existsByBarcode.mockResolvedValue(false);
    items.save.mockResolvedValue();
    items.findByIdWithRelations.mockImplementation(async (id) => {
      const item = StockItem.create({
        id,
        code: 'ITM-000001',
        description: 'Ácido cítrico',
        sku: null,
        barcode: null,
        itemType: 'PRODUCT',
        categoryId: null,
        brandId: null,
        locationId: null,
        measureUnitId: null,
        purchaseUnitId: null,
        saleUnitId: null,
        purchaseToMeasureFactor: null,
        saleToMeasureFactor: null,
        trackStock: true,
        minStock: null,
        maxStock: null,
        currentStock: 0,
        trackLot: false,
        trackExpiry: false,
        costPrice: null,
        salePrice: null,
        ncm: null,
        cest: null,
        origin: null,
        defaultCfop: null,
        fiscalUnit: null,
        complementaryDescription: null,
        notes: null,
        manufacturer: null,
        mainSupplier: null,
      });
      return {
        item,
        relations: {
          categoryName: null,
          brandName: null,
          locationName: null,
          measureUnitCode: null,
          measureUnitLabel: null,
          purchaseUnitCode: null,
          saleUnitCode: null,
        },
      };
    });
  });

  it('rejeita descrição vazia', async () => {
    await expect(
      handler.execute(new CreateStockItemCommand({ description: '  ' })),
    ).rejects.toBeInstanceOf(StockItemValidationError);
  });

  it('rejeita código duplicado', async () => {
    items.existsByCode.mockResolvedValue(true);
    await expect(
      handler.execute(
        new CreateStockItemCommand({
          description: 'Ácido cítrico',
          code: 'ITM-1',
        }),
      ),
    ).rejects.toBeInstanceOf(StockItemDuplicateCodeError);
  });

  it('cria item gerando código quando omitido', async () => {
    const result = await handler.execute(
      new CreateStockItemCommand({ description: 'Ácido cítrico' }),
    );
    expect(items.nextCode).toHaveBeenCalled();
    expect(items.save).toHaveBeenCalled();
    expect(events.publish).toHaveBeenCalled();
    expect(result.code).toBe('ITM-000001');
  });
});
