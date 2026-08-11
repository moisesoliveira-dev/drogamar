import { z } from 'zod'

export const vendasCodigoBarrasConfig = {
  lookupPath: '/api/vendas/produtos/codigo-barras',
  /** Após localizar produto vendável, adiciona ao carrinho automaticamente (fluxo scanner). */
  autoAddOnFound: true,
  /** Incrementa linha existente no carrinho (servidor); espelha política F1. */
  mergeDuplicateScans: true,
  cartPath: '/app/vendas/carrinho',
} as const

export const barcodeUnavailableReasonSchema = z.enum([
  'INACTIVE',
  'OUT_OF_STOCK',
  'INVALID_PRICE',
])

export const barcodeProductSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  salePrice: z.number().nullable(),
  currentStock: z.number(),
  trackStock: z.boolean(),
  unitCode: z.string().nullable(),
  imageUrl: z.string().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  hasValidPrice: z.boolean(),
  outOfStock: z.boolean(),
  canAdd: z.boolean(),
  unavailableReason: barcodeUnavailableReasonSchema.nullable(),
})

export const barcodeLookupResultSchema = z.object({
  found: z.boolean(),
  product: barcodeProductSchema.nullable(),
})

export type BarcodeProduct = z.infer<typeof barcodeProductSchema>
export type BarcodeLookupResult = z.infer<typeof barcodeLookupResultSchema>
export type BarcodeUnavailableReason = z.infer<
  typeof barcodeUnavailableReasonSchema
>

export type BarcodeLookupStatus =
  | 'idle'
  | 'not_found'
  | 'inactive'
  | 'out_of_stock'
  | 'invalid_price'
  | 'found'

export function resolveLookupStatus(
  result: BarcodeLookupResult | null,
): BarcodeLookupStatus {
  if (!result) return 'idle'
  if (!result.found || !result.product) return 'not_found'
  const reason = result.product.unavailableReason
  if (reason === 'INACTIVE') return 'inactive'
  if (reason === 'OUT_OF_STOCK') return 'out_of_stock'
  if (reason === 'INVALID_PRICE') return 'invalid_price'
  return 'found'
}

export function statusMessage(status: BarcodeLookupStatus): {
  title: string
  hint?: string
  variant: 'danger' | 'warn' | 'success' | null
} | null {
  switch (status) {
    case 'not_found':
      return {
        title: 'Produto não encontrado',
        hint: 'Verifique o código informado ou pesquise pelo nome do produto.',
        variant: 'warn',
      }
    case 'inactive':
      return {
        title: 'Produto indisponível',
        variant: 'danger',
      }
    case 'out_of_stock':
      return {
        title: 'Produto sem estoque',
        variant: 'danger',
      }
    case 'invalid_price':
      return {
        title: 'Produto indisponível',
        hint: 'Preço de venda inválido. Ajuste o cadastro antes de vender.',
        variant: 'warn',
      }
    default:
      return null
  }
}
