import { z } from 'zod'

export const vendasCarrinhoConfig = {
  cartPath: '/api/vendas/carrinho',
  itemsPath: '/api/vendas/carrinho/itens',
  itemPath: (lineId: string) => `/api/vendas/carrinho/itens/${lineId}`,
  customerPath: '/api/vendas/carrinho/cliente',
  discountPath: '/api/vendas/carrinho/desconto',
  approveDiscountPath: '/api/vendas/carrinho/desconto/aprovar',
  clearPath: '/api/vendas/carrinho/limpar',
  validatePaymentPath: '/api/vendas/carrinho/validar-pagamento',
  holdPath: '/api/vendas/carrinho/suspender',
  heldPath: '/api/vendas/carrinho/suspensos',
  resumePath: '/api/vendas/carrinho/retomar',
  customersPath: '/api/vendas/clientes',
  productsPath: '/api/vendas/produtos',
} as const

export const cartIssueSchema = z.object({
  code: z.string(),
  message: z.string(),
  itemId: z.string().optional(),
  lineId: z.string().optional(),
})

export const cartCustomerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  documentType: z.enum(['CPF', 'CNPJ', 'OTHER']).nullable(),
  document: z.string().nullable(),
  phone: z.string().nullable().optional(),
})

export const cartItemSchema = z.object({
  id: z.string(),
  stockItemId: z.string(),
  productCode: z.string(),
  productDescription: z.string(),
  sku: z.string().nullable(),
  unitCode: z.string().nullable(),
  quantity: z.number(),
  unitPrice: z.number(),
  lineDiscount: z.number(),
  lineSubtotal: z.number(),
  availableStock: z.number(),
  trackStock: z.boolean(),
  itemStatus: z.enum(['ACTIVE', 'INACTIVE']),
  currentSalePrice: z.number().nullable(),
  outOfStock: z.boolean(),
  invalidPrice: z.boolean(),
  issues: z.array(cartIssueSchema),
  lineDiscountManual: z.boolean().optional().default(false),
  appliedPromotions: z
    .array(
      z.object({
        promotionId: z.string(),
        name: z.string(),
        type: z.string(),
        amount: z.number(),
        lineId: z.string().nullable(),
      }),
    )
    .optional()
    .default([]),
})

export const cartTotalsSchema = z.object({
  subtotal: z.number(),
  discounts: z.number(),
  surcharges: z.number(),
  total: z.number(),
  lineDiscounts: z.number(),
  cartDiscount: z.number(),
})

export const cartSchema = z.object({
  id: z.string(),
  sequentialId: z.number(),
  status: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastValidatedAt: z.string().nullable(),
  operator: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  customer: cartCustomerSchema.nullable(),
  items: z.array(cartItemSchema),
  appliedPromotions: z
    .array(
      z.object({
        promotionId: z.string(),
        name: z.string(),
        type: z.string(),
        amount: z.number(),
        lineId: z.string().nullable(),
      }),
    )
    .optional()
    .default([]),
  cartDiscountManual: z.boolean().optional().default(false),
  operatorDiscountLimitPercent: z.number().optional().default(10),
  totals: cartTotalsSchema,
  canCheckout: z.boolean(),
  issues: z.array(cartIssueSchema),
  warnings: z.array(cartIssueSchema),
  itemsUpdated: z.boolean(),
  itemsUpdatedMessage: z.string().nullable(),
  requireCustomer: z.boolean(),
  paymentReady: z.boolean().optional(),
  nextPath: z.string().nullable().optional(),
})

export const productSearchItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  sku: z.string().nullable(),
  barcode: z.string().nullable(),
  salePrice: z.number().nullable(),
  currentStock: z.number(),
  trackStock: z.boolean(),
  unitCode: z.string().nullable(),
  hasValidPrice: z.boolean(),
  outOfStock: z.boolean(),
})

export const heldCartsSchema = z.object({
  items: z.array(cartSchema),
})

export const productSearchSchema = z.object({
  items: z.array(productSearchItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export const customerSearchItemSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  documentType: z.enum(['CPF', 'CNPJ', 'OTHER']).nullable(),
  document: z.string().nullable(),
  phone: z.string().nullable().optional(),
})

export const customerSearchSchema = z.object({
  items: z.array(customerSearchItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
})

export type SaleCart = z.infer<typeof cartSchema>
export type SaleCartItem = z.infer<typeof cartItemSchema>
export type CartCustomer = z.infer<typeof cartCustomerSchema>
export type ProductSearchItem = z.infer<typeof productSearchItemSchema>
export type CustomerSearchItem = z.infer<typeof customerSearchItemSchema>

export function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatDocument(
  type: string | null | undefined,
  document: string | null | undefined,
): string | null {
  if (!document) return null
  if (type === 'CPF' && document.length === 11) {
    return document.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  }
  if (type === 'CNPJ' && document.length === 14) {
    return document.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      '$1.$2.$3/$4-$5',
    )
  }
  return document
}
