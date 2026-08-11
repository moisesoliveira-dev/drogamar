import { mapBarcodeProduct } from './barcode-product';

const base = {
  id: '1',
  code: 'P001',
  description: 'Dipirona 500mg',
  sku: 'SKU-1',
  barcode: '789123',
  status: 'ACTIVE' as const,
  salePrice: 12.5,
  currentStock: 10,
  trackStock: true,
  unitCode: 'UN',
};

describe('mapBarcodeProduct', () => {
  it('marca canAdd quando ativo, com preço e estoque', () => {
    const view = mapBarcodeProduct(base);
    expect(view.canAdd).toBe(true);
    expect(view.unavailableReason).toBeNull();
    expect(view.hasValidPrice).toBe(true);
    expect(view.outOfStock).toBe(false);
    expect(view.imageUrl).toBeNull();
  });

  it('marca INACTIVE quando produto inativo', () => {
    const view = mapBarcodeProduct({ ...base, status: 'INACTIVE' });
    expect(view.canAdd).toBe(false);
    expect(view.unavailableReason).toBe('INACTIVE');
  });

  it('marca OUT_OF_STOCK quando estoque zerado e trackStock', () => {
    const view = mapBarcodeProduct({ ...base, currentStock: 0 });
    expect(view.canAdd).toBe(false);
    expect(view.outOfStock).toBe(true);
    expect(view.unavailableReason).toBe('OUT_OF_STOCK');
  });

  it('ignora estoque quando trackStock=false', () => {
    const view = mapBarcodeProduct({
      ...base,
      trackStock: false,
      currentStock: 0,
    });
    expect(view.canAdd).toBe(true);
    expect(view.outOfStock).toBe(false);
  });

  it('marca INVALID_PRICE sem preço válido', () => {
    const view = mapBarcodeProduct({ ...base, salePrice: 0 });
    expect(view.canAdd).toBe(false);
    expect(view.unavailableReason).toBe('INVALID_PRICE');
  });
});
