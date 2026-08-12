import { z } from 'zod'

export const globalSearchProductSchema = z.object({
  id: z.string(),
  code: z.string(),
  description: z.string(),
  sku: z.string().nullable().optional(),
})

export const globalSearchCustomerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  document: z.string().nullable().optional(),
})

export const globalSearchProductListSchema = z.object({
  items: z.array(globalSearchProductSchema),
})

export const globalSearchCustomerListSchema = z.object({
  items: z.array(globalSearchCustomerSchema),
})

export type GlobalSearchProduct = z.infer<typeof globalSearchProductSchema>
export type GlobalSearchCustomer = z.infer<typeof globalSearchCustomerSchema>

export type GlobalSearchHit =
  | {
      id: string
      kind: 'page'
      title: string
      subtitle: string
      path: string
      moduleLabel: string
    }
  | {
      id: string
      kind: 'product'
      title: string
      subtitle: string
      path: string
      productId: string
    }
  | {
      id: string
      kind: 'customer'
      title: string
      subtitle: string
      path: string
      customerId: string
    }
