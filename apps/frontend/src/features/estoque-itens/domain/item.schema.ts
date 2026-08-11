import { z } from 'zod'

export const stockItemStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
export const stockItemTypeSchema = z.enum([
  'PRODUCT',
  'RAW_MATERIAL',
  'PACKAGING',
  'SERVICE',
  'OTHER',
])

export const stockItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  status: stockItemStatusSchema,
  itemType: stockItemTypeSchema,
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  brandId: z.string().nullable(),
  brandName: z.string().nullable(),
  locationId: z.string().nullable(),
  locationName: z.string().nullable(),
  measureUnitId: z.string().nullable(),
  measureUnitCode: z.string().nullable(),
  measureUnitLabel: z.string().nullable(),
  purchaseUnitId: z.string().nullable(),
  purchaseUnitCode: z.string().nullable(),
  saleUnitId: z.string().nullable(),
  saleUnitCode: z.string().nullable(),
  purchaseToMeasureFactor: z.number().nullable(),
  saleToMeasureFactor: z.number().nullable(),
  trackStock: z.boolean(),
  minStock: z.number().nullable(),
  maxStock: z.number().nullable(),
  currentStock: z.number(),
  trackLot: z.boolean(),
  trackExpiry: z.boolean(),
  costPrice: z.number().nullable(),
  salePrice: z.number().nullable(),
  marginPercent: z.number().nullable(),
  ncm: z.string().nullable(),
  cest: z.string().nullable(),
  origin: z.string().nullable(),
  defaultCfop: z.string().nullable(),
  fiscalUnit: z.string().nullable(),
  complementaryDescription: z.string().nullable(),
  notes: z.string().nullable(),
  manufacturer: z.string().nullable(),
  mainSupplier: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type StockItem = z.infer<typeof stockItemSchema>

export const stockItemListSchema = z.object({
  items: z.array(stockItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export type StockItemList = z.infer<typeof stockItemListSchema>

export const lookupOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  code: z.string().optional(),
})

export const stockLookupsSchema = z.object({
  categories: z.array(lookupOptionSchema),
  brands: z.array(lookupOptionSchema),
  locations: z.array(lookupOptionSchema),
  units: z.array(lookupOptionSchema),
  itemTypes: z.array(z.object({ id: z.string(), label: z.string() })),
})

export type StockLookups = z.infer<typeof stockLookupsSchema>

const optionalNumber = z.preprocess((value) => {
  if (value === '' || value == null) return null
  if (typeof value === 'number') return Number.isNaN(value) ? null : value
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}, z.number().nonnegative().nullable())

export const stockItemFormSchema = z
  .object({
    code: z.string().trim().max(64).optional().or(z.literal('')),
    description: z.string().trim().min(1, 'Descrição é obrigatória.'),
    sku: z.string().trim().max(64).optional().or(z.literal('')),
    barcode: z.string().trim().max(64).optional().or(z.literal('')),
    status: stockItemStatusSchema.default('ACTIVE'),
    itemType: stockItemTypeSchema.default('PRODUCT'),
    categoryId: z.string().optional().or(z.literal('')),
    brandId: z.string().optional().or(z.literal('')),
    locationId: z.string().optional().or(z.literal('')),
    measureUnitId: z.string().optional().or(z.literal('')),
    purchaseUnitId: z.string().optional().or(z.literal('')),
    saleUnitId: z.string().optional().or(z.literal('')),
    purchaseToMeasureFactor: optionalNumber,
    saleToMeasureFactor: optionalNumber,
    trackStock: z.boolean().default(true),
    minStock: optionalNumber,
    maxStock: optionalNumber,
    initialStock: optionalNumber,
    trackLot: z.boolean().default(false),
    trackExpiry: z.boolean().default(false),
    costPrice: optionalNumber,
    salePrice: optionalNumber,
    ncm: z.string().trim().max(16).optional().or(z.literal('')),
    cest: z.string().trim().max(16).optional().or(z.literal('')),
    origin: z.string().trim().max(32).optional().or(z.literal('')),
    defaultCfop: z.string().trim().max(16).optional().or(z.literal('')),
    fiscalUnit: z.string().trim().max(16).optional().or(z.literal('')),
    complementaryDescription: z.string().trim().max(2000).optional().or(z.literal('')),
    notes: z.string().trim().max(2000).optional().or(z.literal('')),
    manufacturer: z.string().trim().max(255).optional().or(z.literal('')),
    mainSupplier: z.string().trim().max(255).optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    if (
      data.minStock != null &&
      data.maxStock != null &&
      data.minStock > data.maxStock
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['minStock'],
        message: 'Estoque mínimo não pode ser maior que o máximo.',
      })
    }
  })

export type StockItemFormValues = z.output<typeof stockItemFormSchema>

export type StockItemFormInput = {
  code?: string
  description: string
  sku?: string
  barcode?: string
  status?: 'ACTIVE' | 'INACTIVE'
  itemType?: StockItem['itemType']
  categoryId?: string
  brandId?: string
  locationId?: string
  measureUnitId?: string
  purchaseUnitId?: string
  saleUnitId?: string
  purchaseToMeasureFactor?: number | null
  saleToMeasureFactor?: number | null
  trackStock?: boolean
  minStock?: number | null
  maxStock?: number | null
  initialStock?: number | null
  trackLot?: boolean
  trackExpiry?: boolean
  costPrice?: number | null
  salePrice?: number | null
  ncm?: string
  cest?: string
  origin?: string
  defaultCfop?: string
  fiscalUnit?: string
  complementaryDescription?: string
  notes?: string
  manufacturer?: string
  mainSupplier?: string
}

export const estoqueConfig = {
  listPath: '/api/estoque/itens',
  itemPath: (id: string) => `/api/estoque/itens/${id}`,
  duplicatePath: (id: string) => `/api/estoque/itens/${id}/duplicate`,
  deactivatePath: (id: string) => `/api/estoque/itens/${id}/deactivate`,
  activatePath: (id: string) => `/api/estoque/itens/${id}/activate`,
  lookupsPath: '/api/estoque/lookups',
}

export function emptyStockItemForm(): StockItemFormInput {
  return {
    code: '',
    description: '',
    sku: '',
    barcode: '',
    status: 'ACTIVE',
    itemType: 'PRODUCT',
    categoryId: '',
    brandId: '',
    locationId: '',
    measureUnitId: '',
    purchaseUnitId: '',
    saleUnitId: '',
    purchaseToMeasureFactor: null,
    saleToMeasureFactor: null,
    trackStock: true,
    minStock: null,
    maxStock: null,
    initialStock: 0,
    trackLot: false,
    trackExpiry: false,
    costPrice: null,
    salePrice: null,
    ncm: '',
    cest: '',
    origin: '',
    defaultCfop: '',
    fiscalUnit: '',
    complementaryDescription: '',
    notes: '',
    manufacturer: '',
    mainSupplier: '',
  }
}

export function stockItemToForm(item: StockItem): StockItemFormInput {
  return {
    code: item.code,
    description: item.description,
    sku: item.sku ?? '',
    barcode: item.barcode ?? '',
    status: item.status,
    itemType: item.itemType,
    categoryId: item.categoryId ?? '',
    brandId: item.brandId ?? '',
    locationId: item.locationId ?? '',
    measureUnitId: item.measureUnitId ?? '',
    purchaseUnitId: item.purchaseUnitId ?? '',
    saleUnitId: item.saleUnitId ?? '',
    purchaseToMeasureFactor: item.purchaseToMeasureFactor,
    saleToMeasureFactor: item.saleToMeasureFactor,
    trackStock: item.trackStock,
    minStock: item.minStock,
    maxStock: item.maxStock,
    initialStock: null,
    trackLot: item.trackLot,
    trackExpiry: item.trackExpiry,
    costPrice: item.costPrice,
    salePrice: item.salePrice,
    ncm: item.ncm ?? '',
    cest: item.cest ?? '',
    origin: item.origin ?? '',
    defaultCfop: item.defaultCfop ?? '',
    fiscalUnit: item.fiscalUnit ?? '',
    complementaryDescription: item.complementaryDescription ?? '',
    notes: item.notes ?? '',
    manufacturer: item.manufacturer ?? '',
    mainSupplier: item.mainSupplier ?? '',
  }
}

export function formToPayload(values: StockItemFormValues) {
  const empty = (v?: string | null) => {
    const t = v?.trim()
    return t ? t : null
  }
  return {
    code: empty(values.code),
    description: values.description.trim(),
    sku: empty(values.sku),
    barcode: empty(values.barcode),
    status: values.status,
    itemType: values.itemType,
    categoryId: empty(values.categoryId),
    brandId: empty(values.brandId),
    locationId: empty(values.locationId),
    measureUnitId: empty(values.measureUnitId),
    purchaseUnitId: empty(values.purchaseUnitId),
    saleUnitId: empty(values.saleUnitId),
    purchaseToMeasureFactor: values.purchaseToMeasureFactor,
    saleToMeasureFactor: values.saleToMeasureFactor,
    trackStock: values.trackStock,
    minStock: values.minStock,
    maxStock: values.maxStock,
    initialStock: values.initialStock,
    trackLot: values.trackLot,
    trackExpiry: values.trackExpiry,
    costPrice: values.costPrice,
    salePrice: values.salePrice,
    ncm: empty(values.ncm),
    cest: empty(values.cest),
    origin: empty(values.origin),
    defaultCfop: empty(values.defaultCfop),
    fiscalUnit: empty(values.fiscalUnit),
    complementaryDescription: empty(values.complementaryDescription),
    notes: empty(values.notes),
    manufacturer: empty(values.manufacturer),
    mainSupplier: empty(values.mainSupplier),
  }
}
