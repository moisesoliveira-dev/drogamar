import { apiFetch } from '../../../shared/lib/http'
import {
  globalSearchCustomerListSchema,
  globalSearchProductListSchema,
  type GlobalSearchCustomer,
  type GlobalSearchProduct,
} from '../domain/global-search.schema'

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function searchProductsRequest(
  search: string,
): Promise<GlobalSearchProduct[]> {
  const response = await apiFetch(
    `/api/vendas/produtos${toQuery({ search, page: 1, pageSize: 5 })}`,
  )
  if (!response.ok) return []
  const data = globalSearchProductListSchema.parse(await response.json())
  return data.items
}

export async function searchCustomersRequest(
  search: string,
): Promise<GlobalSearchCustomer[]> {
  const response = await apiFetch(
    `/api/vendas/clientes${toQuery({ search, page: 1, pageSize: 5 })}`,
  )
  if (!response.ok) return []
  const data = globalSearchCustomerListSchema.parse(await response.json())
  return data.items
}

export async function setCartCustomerRequest(customerId: string): Promise<void> {
  await apiFetch('/api/vendas/carrinho/cliente', {
    method: 'PUT',
    body: JSON.stringify({ customerId }),
  })
}
