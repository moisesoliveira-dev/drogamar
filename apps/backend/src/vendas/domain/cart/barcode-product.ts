export type BarcodeUnavailableReason =
  'INACTIVE' | 'OUT_OF_STOCK' | 'INVALID_PRICE';

export type BarcodeProductInput = {
  id: string;
  code: string;
  description: string;
  sku: string | null;
  barcode: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  salePrice: number | null;
  currentStock: number;
  trackStock: boolean;
  unitCode: string | null;
  imageUrl?: string | null;
};

export type BarcodeProductView = {
  id: string;
  code: string;
  description: string;
  sku: string | null;
  barcode: string | null;
  salePrice: number | null;
  currentStock: number;
  trackStock: boolean;
  unitCode: string | null;
  imageUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  hasValidPrice: boolean;
  outOfStock: boolean;
  canAdd: boolean;
  unavailableReason: BarcodeUnavailableReason | null;
};

export function mapBarcodeProduct(
  product: BarcodeProductInput,
): BarcodeProductView {
  const hasValidPrice = product.salePrice != null && product.salePrice > 0;
  const outOfStock = product.trackStock && product.currentStock <= 0;

  let unavailableReason: BarcodeUnavailableReason | null = null;
  if (product.status !== 'ACTIVE') {
    unavailableReason = 'INACTIVE';
  } else if (!hasValidPrice) {
    unavailableReason = 'INVALID_PRICE';
  } else if (outOfStock) {
    unavailableReason = 'OUT_OF_STOCK';
  }

  return {
    id: product.id,
    code: product.code,
    description: product.description,
    sku: product.sku,
    barcode: product.barcode,
    salePrice: product.salePrice,
    currentStock: product.currentStock,
    trackStock: product.trackStock,
    unitCode: product.unitCode,
    imageUrl: product.imageUrl ?? null,
    status: product.status,
    hasValidPrice,
    outOfStock,
    canAdd: unavailableReason == null,
    unavailableReason,
  };
}
