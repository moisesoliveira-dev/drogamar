export type StockItemStatus = 'ACTIVE' | 'INACTIVE';

export type StockItemType =
  | 'PRODUCT'
  | 'RAW_MATERIAL'
  | 'PACKAGING'
  | 'SERVICE'
  | 'OTHER';

export type StockItemProps = {
  id: string;
  code: string;
  description: string;
  sku: string | null;
  barcode: string | null;
  status: StockItemStatus;
  itemType: StockItemType;
  categoryId: string | null;
  brandId: string | null;
  locationId: string | null;
  measureUnitId: string | null;
  purchaseUnitId: string | null;
  saleUnitId: string | null;
  purchaseToMeasureFactor: number | null;
  saleToMeasureFactor: number | null;
  trackStock: boolean;
  minStock: number | null;
  maxStock: number | null;
  currentStock: number;
  trackLot: boolean;
  trackExpiry: boolean;
  costPrice: number | null;
  salePrice: number | null;
  ncm: string | null;
  cest: string | null;
  origin: string | null;
  defaultCfop: string | null;
  fiscalUnit: string | null;
  complementaryDescription: string | null;
  notes: string | null;
  manufacturer: string | null;
  mainSupplier: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class StockItem {
  private constructor(readonly props: StockItemProps) {}

  static create(
    props: Omit<StockItemProps, 'createdAt' | 'updatedAt' | 'status'> & {
      status?: StockItemStatus;
      createdAt?: Date;
      updatedAt?: Date;
    },
  ): StockItem {
    const now = new Date();
    return new StockItem({
      ...props,
      status: props.status ?? 'ACTIVE',
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  static rehydrate(props: StockItemProps): StockItem {
    return new StockItem(props);
  }

  get id() {
    return this.props.id;
  }

  get code() {
    return this.props.code;
  }

  deactivate(): StockItem {
    return StockItem.rehydrate({
      ...this.props,
      status: 'INACTIVE',
      updatedAt: new Date(),
    });
  }

  activate(): StockItem {
    return StockItem.rehydrate({
      ...this.props,
      status: 'ACTIVE',
      updatedAt: new Date(),
    });
  }

  withUpdates(
    patch: Partial<
      Omit<StockItemProps, 'id' | 'createdAt' | 'updatedAt' | 'currentStock'>
    > & { currentStock?: number },
  ): StockItem {
    return StockItem.rehydrate({
      ...this.props,
      ...patch,
      updatedAt: new Date(),
    });
  }
}
