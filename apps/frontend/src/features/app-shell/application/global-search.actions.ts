import { appModules } from '../domain/nav.config'
import type { GlobalSearchHit } from '../domain/global-search.schema'
import { searchNavPages } from '../domain/search-nav'
import {
  searchCustomersRequest,
  searchProductsRequest,
  setCartCustomerRequest,
} from '../infrastructure/global-search.api'

export async function searchSystemAction(query: string): Promise<{
  pages: GlobalSearchHit[]
  products: GlobalSearchHit[]
  customers: GlobalSearchHit[]
}> {
  const q = query.trim()
  if (!q) {
    return { pages: [], products: [], customers: [] }
  }

  const pages: GlobalSearchHit[] = searchNavPages(appModules, q, 6)

  if (q.length < 2) {
    return { pages, products: [], customers: [] }
  }

  const [productsRaw, customersRaw] = await Promise.all([
    searchProductsRequest(q),
    searchCustomersRequest(q),
  ])

  const products: GlobalSearchHit[] = productsRaw.map((p) => ({
    id: `product:${p.id}`,
    kind: 'product' as const,
    title: p.description,
    subtitle: [p.code, p.sku].filter(Boolean).join(' · '),
    path: `/app/estoque/itens/${p.id}`,
    productId: p.id,
  }))

  const customers: GlobalSearchHit[] = customersRaw.map((c) => ({
    id: `customer:${c.id}`,
    kind: 'customer' as const,
    title: c.name,
    subtitle: [c.code, c.document].filter(Boolean).join(' · '),
    path: '/app/vendas/carrinho',
    customerId: c.id,
  }))

  return { pages, products, customers }
}

export async function selectCustomerForSaleAction(customerId: string) {
  await setCartCustomerRequest(customerId)
}
