import { z } from 'zod'

export const vendasBuscaIaConfig = {
  searchPath: '/api/vendas/busca-ia',
  statusPath: '/api/vendas/busca-ia/status',
  traditionalPath: '/app/vendas/codigo-barras',
  balcaoPath: '/app/vendas/balcao',
  examples: [
    'Quero uma bebida sem açúcar.',
    'Tem algum produto da marca Genérico?',
    'Mostre produtos abaixo de R$ 50.',
    'Quais produtos estão em estoque?',
    'Produtos da categoria Insumos abaixo de 20 reais.',
  ],
} as const

export const searchIntentSchema = z.object({
  raw: z.string(),
  search: z.string().nullable(),
  categoryName: z.string().nullable(),
  brandName: z.string().nullable(),
  priceMin: z.number().nullable(),
  priceMax: z.number().nullable(),
  inStock: z.boolean().nullable(),
  similarTo: z.string().nullable(),
})

export const buscaIaItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  salePrice: z.number().nullable(),
  currentStock: z.number(),
  trackStock: z.boolean(),
  unitCode: z.string().nullable(),
  categoryName: z.string().nullable(),
  brandName: z.string().nullable(),
  imageUrl: z.string().nullable(),
  hasValidPrice: z.boolean(),
  outOfStock: z.boolean(),
  canAdd: z.boolean(),
})

export const buscaIaResultSchema = z.object({
  query: z.string(),
  source: z.enum(['local', 'llm']),
  llmAvailable: z.boolean(),
  interpreted: searchIntentSchema,
  message: z.string(),
  items: z.array(buscaIaItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const buscaIaStatusSchema = z.object({
  available: z.boolean(),
})

export type BuscaIaItem = z.infer<typeof buscaIaItemSchema>
export type BuscaIaResult = z.infer<typeof buscaIaResultSchema>
export type BuscaIaUiState =
  | 'idle'
  | 'typing'
  | 'loading'
  | 'results'
  | 'empty'
  | 'error'
  | 'unavailable'
