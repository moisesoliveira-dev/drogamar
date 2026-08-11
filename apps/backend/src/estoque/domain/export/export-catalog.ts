import type { ExportColumnDef, ExportTypeMeta, StockExportType } from './export-types';

const itemColumns: ExportColumnDef[] = [
  { id: 'code', label: 'Código', group: 'Identificação', defaultSelected: true },
  {
    id: 'description',
    label: 'Descrição',
    group: 'Identificação',
    defaultSelected: true,
  },
  { id: 'sku', label: 'SKU', group: 'Identificação', defaultSelected: true },
  {
    id: 'barcode',
    label: 'Código de barras',
    group: 'Identificação',
    defaultSelected: true,
  },
  {
    id: 'itemType',
    label: 'Tipo',
    group: 'Identificação',
    defaultSelected: false,
  },
  {
    id: 'status',
    label: 'Status',
    group: 'Identificação',
    defaultSelected: true,
  },
  {
    id: 'categoryName',
    label: 'Categoria',
    group: 'Classificação',
    defaultSelected: true,
  },
  {
    id: 'brandName',
    label: 'Marca',
    group: 'Classificação',
    defaultSelected: true,
  },
  {
    id: 'locationName',
    label: 'Localização',
    group: 'Estoque',
    defaultSelected: true,
  },
  {
    id: 'measureUnitCode',
    label: 'Unidade',
    group: 'Estoque',
    defaultSelected: true,
  },
  {
    id: 'currentStock',
    label: 'Estoque atual',
    group: 'Estoque',
    defaultSelected: true,
  },
  {
    id: 'minStock',
    label: 'Estoque mínimo',
    group: 'Estoque',
    defaultSelected: false,
  },
  {
    id: 'maxStock',
    label: 'Estoque máximo',
    group: 'Estoque',
    defaultSelected: false,
  },
  {
    id: 'costPrice',
    label: 'Preço de custo',
    group: 'Comercial',
    defaultSelected: false,
    sensitive: true,
  },
  {
    id: 'salePrice',
    label: 'Preço de venda',
    group: 'Comercial',
    defaultSelected: false,
    sensitive: true,
  },
  {
    id: 'mainSupplier',
    label: 'Fornecedor principal',
    group: 'Comercial',
    defaultSelected: false,
  },
  { id: 'ncm', label: 'NCM', group: 'Fiscal', defaultSelected: false },
  { id: 'cest', label: 'CEST', group: 'Fiscal', defaultSelected: false },
  { id: 'origin', label: 'Origem', group: 'Fiscal', defaultSelected: false },
  {
    id: 'defaultCfop',
    label: 'CFOP padrão',
    group: 'Fiscal',
    defaultSelected: false,
  },
  {
    id: 'updatedAt',
    label: 'Atualizado em',
    group: 'Sistema',
    defaultSelected: false,
  },
];

const lotColumns: ExportColumnDef[] = [
  {
    id: 'itemCode',
    label: 'Código do item',
    group: 'Item',
    defaultSelected: true,
  },
  {
    id: 'itemDescription',
    label: 'Descrição do item',
    group: 'Item',
    defaultSelected: true,
  },
  {
    id: 'categoryName',
    label: 'Categoria',
    group: 'Item',
    defaultSelected: true,
  },
  { id: 'lotNumber', label: 'Lote', group: 'Lote', defaultSelected: true },
  {
    id: 'expiryDate',
    label: 'Data de validade',
    group: 'Lote',
    defaultSelected: true,
  },
  {
    id: 'daysRemaining',
    label: 'Dias restantes',
    group: 'Lote',
    defaultSelected: true,
  },
  {
    id: 'statusLabel',
    label: 'Status de validade',
    group: 'Lote',
    defaultSelected: true,
  },
  { id: 'quantity', label: 'Quantidade', group: 'Lote', defaultSelected: true },
  {
    id: 'locationName',
    label: 'Localização',
    group: 'Lote',
    defaultSelected: true,
  },
  {
    id: 'manufacturingDate',
    label: 'Fabricação',
    group: 'Lote',
    defaultSelected: false,
  },
  {
    id: 'valueAtRisk',
    label: 'Valor em risco',
    group: 'Comercial',
    defaultSelected: false,
    sensitive: true,
  },
];

const currentStockColumns: ExportColumnDef[] = [
  { id: 'code', label: 'Código', group: 'Identificação', defaultSelected: true },
  {
    id: 'description',
    label: 'Descrição',
    group: 'Identificação',
    defaultSelected: true,
  },
  {
    id: 'categoryName',
    label: 'Categoria',
    group: 'Classificação',
    defaultSelected: true,
  },
  {
    id: 'locationName',
    label: 'Localização',
    group: 'Estoque',
    defaultSelected: true,
  },
  {
    id: 'measureUnitCode',
    label: 'Unidade',
    group: 'Estoque',
    defaultSelected: true,
  },
  {
    id: 'currentStock',
    label: 'Quantidade',
    group: 'Estoque',
    defaultSelected: true,
  },
  {
    id: 'minStock',
    label: 'Estoque mínimo',
    group: 'Estoque',
    defaultSelected: true,
  },
  {
    id: 'maxStock',
    label: 'Estoque máximo',
    group: 'Estoque',
    defaultSelected: false,
  },
  {
    id: 'status',
    label: 'Status',
    group: 'Identificação',
    defaultSelected: true,
  },
  {
    id: 'costPrice',
    label: 'Custo unitário',
    group: 'Comercial',
    defaultSelected: false,
    sensitive: true,
  },
];

const categoryColumns: ExportColumnDef[] = [
  { id: 'name', label: 'Nome', group: 'Categoria', defaultSelected: true },
  { id: 'active', label: 'Ativa', group: 'Categoria', defaultSelected: true },
  {
    id: 'itemCount',
    label: 'Itens vinculados',
    group: 'Categoria',
    defaultSelected: true,
  },
  {
    id: 'createdAt',
    label: 'Criada em',
    group: 'Sistema',
    defaultSelected: false,
  },
  {
    id: 'updatedAt',
    label: 'Atualizada em',
    group: 'Sistema',
    defaultSelected: false,
  },
];

export const EXPORT_TYPE_CATALOG: Record<StockExportType, ExportTypeMeta> = {
  ITEMS: {
    type: 'ITEMS',
    label: 'Itens do estoque',
    description: 'Dados provenientes do F1 — Cadastro de Itens.',
    formats: ['XLSX', 'CSV'],
    columns: itemColumns,
    sortOptions: [
      { id: 'code', label: 'Código' },
      { id: 'description', label: 'Descrição' },
      { id: 'currentStock', label: 'Quantidade' },
      { id: 'updatedAt', label: 'Data de atualização' },
      { id: 'status', label: 'Status' },
    ],
    defaultSortBy: 'description',
    defaultSortDir: 'asc',
    filterKeys: [
      'code',
      'description',
      'sku',
      'barcode',
      'categoryId',
      'brandId',
      'status',
      'measureUnitId',
      'locationId',
      'search',
    ],
  },
  LOTS_EXPIRY: {
    type: 'LOTS_EXPIRY',
    label: 'Lotes e validade',
    description: 'Informações relacionadas ao F2 — Alerta de Validade.',
    formats: ['XLSX', 'CSV', 'PDF'],
    columns: lotColumns,
    sortOptions: [
      { id: 'expiryDate', label: 'Data de validade' },
      { id: 'daysRemaining', label: 'Dias restantes' },
      { id: 'quantity', label: 'Quantidade' },
      { id: 'item', label: 'Item' },
    ],
    defaultSortBy: 'expiryDate',
    defaultSortDir: 'asc',
    filterKeys: [
      'search',
      'categoryId',
      'lotNumber',
      'status',
      'expiryFrom',
      'expiryTo',
      'locationId',
      'onlyWithQuantity',
      'alertWindowDays',
    ],
  },
  CURRENT_STOCK: {
    type: 'CURRENT_STOCK',
    label: 'Estoque atual',
    description: 'Posição atual de quantidade dos itens cadastrados.',
    formats: ['XLSX', 'CSV', 'PDF'],
    columns: currentStockColumns,
    sortOptions: [
      { id: 'code', label: 'Código' },
      { id: 'description', label: 'Descrição' },
      { id: 'currentStock', label: 'Quantidade' },
      { id: 'updatedAt', label: 'Data de atualização' },
    ],
    defaultSortBy: 'description',
    defaultSortDir: 'asc',
    filterKeys: [
      'search',
      'categoryId',
      'locationId',
      'status',
      'qtyMin',
      'qtyMax',
    ],
  },
  CATEGORIES: {
    type: 'CATEGORIES',
    label: 'Categorias',
    description: 'Categorias de estoque e quantidade de itens vinculados.',
    formats: ['XLSX', 'CSV'],
    columns: categoryColumns,
    sortOptions: [
      { id: 'name', label: 'Nome' },
      { id: 'updatedAt', label: 'Data de atualização' },
    ],
    defaultSortBy: 'name',
    defaultSortDir: 'asc',
    filterKeys: ['search', 'active'],
  },
};

export function getExportTypeMeta(type: StockExportType): ExportTypeMeta {
  return EXPORT_TYPE_CATALOG[type];
}

export function defaultColumnsFor(
  type: StockExportType,
  allowSensitive: boolean,
): string[] {
  return EXPORT_TYPE_CATALOG[type].columns
    .filter((col) => col.defaultSelected && (allowSensitive || !col.sensitive))
    .map((col) => col.id);
}
