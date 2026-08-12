import {
  addCartItemRequest,
  clearCartRequest,
  getCartRequest,
  holdCartRequest,
  listHeldCartsRequest,
  removeCartItemRequest,
  resumeHeldCartRequest,
  searchCustomersRequest,
  searchProductsRequest,
  approveCartDiscountRequest,
  setCartCustomerRequest,
  setCartDiscountRequest,
  updateCartItemRequest,
  validatePaymentRequest,
} from '../infrastructure/carrinho.api'

export async function getCartAction() {
  return getCartRequest()
}

export async function addCartItemAction(input: {
  stockItemId: string
  quantity?: number
}) {
  return addCartItemRequest(input)
}

export async function updateCartItemAction(
  lineId: string,
  input: { quantity?: number; lineDiscount?: number },
) {
  return updateCartItemRequest(lineId, input)
}

export async function removeCartItemAction(lineId: string) {
  return removeCartItemRequest(lineId)
}

export async function setCartCustomerAction(customerId: string | null) {
  return setCartCustomerRequest(customerId)
}

export async function setCartDiscountAction(
  cartDiscount: number,
  reason?: string,
) {
  return setCartDiscountRequest(cartDiscount, reason)
}

export async function approveCartDiscountAction(
  cartDiscount: number,
  reason: string,
) {
  return approveCartDiscountRequest(cartDiscount, reason)
}

export async function clearCartAction() {
  return clearCartRequest()
}

export async function validatePaymentAction() {
  return validatePaymentRequest()
}

export async function searchProductsAction(search?: string, page = 1) {
  return searchProductsRequest({ search, page })
}

export async function searchCustomersAction(search?: string, page = 1) {
  return searchCustomersRequest({ search, page })
}

export async function holdCartAction() {
  return holdCartRequest()
}

export async function listHeldCartsAction() {
  return listHeldCartsRequest()
}

export async function resumeHeldCartAction(cartId: string) {
  return resumeHeldCartRequest(cartId)
}
