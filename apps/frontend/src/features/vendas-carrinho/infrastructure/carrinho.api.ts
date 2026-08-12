import { apiFetch, HttpNetworkError } from '../../../shared/lib/http'
import {
  CarrinhoNetworkError,
  CarrinhoServiceError,
} from '../domain/errors'
import {
  cartSchema,
  customerSearchSchema,
  heldCartsSchema,
  productSearchSchema,
  vendasCarrinhoConfig,
  type SaleCart,
} from '../domain/carrinho.schema'

async function mapError(response: Response): Promise<never> {
  let message: string | undefined
  let code: string | undefined
  try {
    const body = (await response.json()) as {
      code?: string
      message?: string
    }
    code = body.code
    message = body.message
  } catch {
    // ignore
  }
  throw new CarrinhoServiceError(
    message ?? 'Não foi possível concluir a operação.',
    code,
  )
}

async function request(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await apiFetch(path, init)
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new CarrinhoNetworkError()
    throw error
  }
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return
    q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function getCartRequest(): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.cartPath)
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function addCartItemRequest(body: {
  stockItemId: string
  quantity?: number
}): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.itemsPath, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function updateCartItemRequest(
  lineId: string,
  body: { quantity?: number; lineDiscount?: number },
): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.itemPath(lineId), {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function removeCartItemRequest(lineId: string): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.itemPath(lineId), {
    method: 'DELETE',
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function setCartCustomerRequest(
  customerId: string | null,
): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.customerPath, {
    method: 'PUT',
    body: JSON.stringify({ customerId }),
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function setCartDiscountRequest(
  cartDiscount: number,
): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.discountPath, {
    method: 'PATCH',
    body: JSON.stringify({ cartDiscount }),
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function clearCartRequest(): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.clearPath, {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function holdCartRequest(): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.holdPath, {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function listHeldCartsRequest() {
  const response = await request(vendasCarrinhoConfig.heldPath)
  if (!response.ok) await mapError(response)
  return heldCartsSchema.parse(await response.json())
}

export async function resumeHeldCartRequest(cartId: string): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.resumePath, {
    method: 'POST',
    body: JSON.stringify({ cartId }),
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function validatePaymentRequest(): Promise<SaleCart> {
  const response = await request(vendasCarrinhoConfig.validatePaymentPath, {
    method: 'POST',
  })
  if (!response.ok) await mapError(response)
  return cartSchema.parse(await response.json())
}

export async function searchProductsRequest(params: {
  search?: string
  page?: number
}) {
  const response = await request(
    `${vendasCarrinhoConfig.productsPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return productSearchSchema.parse(await response.json())
}

export async function searchCustomersRequest(params: {
  search?: string
  page?: number
}) {
  const response = await request(
    `${vendasCarrinhoConfig.customersPath}${toQuery(params)}`,
  )
  if (!response.ok) await mapError(response)
  return customerSearchSchema.parse(await response.json())
}
