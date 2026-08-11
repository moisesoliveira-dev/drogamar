import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  addCartItemAction,
  clearCartAction,
  getCartAction,
  removeCartItemAction,
  searchCustomersAction,
  searchProductsAction,
  setCartCustomerAction,
  setCartDiscountAction,
  updateCartItemAction,
  validatePaymentAction,
} from '../application/carrinho.actions'
import { useCarrinhoPermissions } from '../application/use-carrinho-permissions'
import { mapCarrinhoError } from '../domain/errors'
import { VENDAS_CARRINHO_QUERY_KEY } from '../domain/query-keys'
import { CarrinhoPage } from '../components/CarrinhoPage'
import { useCarrinhoUiStore } from '../stores/carrinho.store'

const CART_KEY = VENDAS_CARRINHO_QUERY_KEY

export function CarrinhoContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const permissions = useCarrinhoPermissions()

  const productDialogOpen = useCarrinhoUiStore((s) => s.productDialogOpen)
  const customerDialogOpen = useCarrinhoUiStore((s) => s.customerDialogOpen)
  const productSearch = useCarrinhoUiStore((s) => s.productSearch)
  const customerSearch = useCarrinhoUiStore((s) => s.customerSearch)
  const setProductDialogOpen = useCarrinhoUiStore((s) => s.setProductDialogOpen)
  const setCustomerDialogOpen = useCarrinhoUiStore(
    (s) => s.setCustomerDialogOpen,
  )
  const setProductSearch = useCarrinhoUiStore((s) => s.setProductSearch)
  const setCustomerSearch = useCarrinhoUiStore((s) => s.setCustomerSearch)

  const [productSearchDraft, setProductSearchDraft] = useState(productSearch)
  const [customerSearchDraft, setCustomerSearchDraft] =
    useState(customerSearch)
  const [cartDiscountDraft, setCartDiscountDraft] = useState<string | null>(
    null,
  )
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(
      () => setProductSearch(productSearchDraft),
      300,
    )
    return () => window.clearTimeout(handle)
  }, [productSearchDraft, setProductSearch])

  useEffect(() => {
    const handle = window.setTimeout(
      () => setCustomerSearch(customerSearchDraft),
      300,
    )
    return () => window.clearTimeout(handle)
  }, [customerSearchDraft, setCustomerSearch])

  const cartQuery = useQuery({
    queryKey: CART_KEY,
    queryFn: getCartAction,
  })

  const discountValue =
    cartDiscountDraft ??
    String(cartQuery.data?.totals.cartDiscount ?? 0)

  const productsQuery = useQuery({
    queryKey: ['vendas-carrinho-produtos', productSearch],
    queryFn: () => searchProductsAction(productSearch || undefined),
    enabled: productDialogOpen,
  })

  const customersQuery = useQuery({
    queryKey: ['vendas-carrinho-clientes', customerSearch],
    queryFn: () => searchCustomersAction(customerSearch || undefined),
    enabled: customerDialogOpen,
  })

  const invalidateCart = async () => {
    await queryClient.invalidateQueries({ queryKey: CART_KEY })
  }

  const mutationOptions = {
    onSuccess: async () => {
      setLocalError(null)
      await invalidateCart()
    },
    onError: (error: unknown) => setLocalError(mapCarrinhoError(error)),
  }

  const addMutation = useMutation({
    mutationFn: addCartItemAction,
    ...mutationOptions,
    onSuccess: async () => {
      setLocalError(null)
      setProductDialogOpen(false)
      await invalidateCart()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      lineId,
      quantity,
      lineDiscount,
    }: {
      lineId: string
      quantity?: number
      lineDiscount?: number
    }) => updateCartItemAction(lineId, { quantity, lineDiscount }),
    ...mutationOptions,
  })

  const removeMutation = useMutation({
    mutationFn: removeCartItemAction,
    ...mutationOptions,
  })

  const customerMutation = useMutation({
    mutationFn: setCartCustomerAction,
    ...mutationOptions,
    onSuccess: async () => {
      setLocalError(null)
      setCustomerDialogOpen(false)
      await invalidateCart()
    },
  })

  const discountMutation = useMutation({
    mutationFn: setCartDiscountAction,
    onSuccess: async () => {
      setLocalError(null)
      setCartDiscountDraft(null)
      await invalidateCart()
    },
    onError: (error: unknown) => setLocalError(mapCarrinhoError(error)),
  })

  const clearMutation = useMutation({
    mutationFn: clearCartAction,
    ...mutationOptions,
  })

  const checkoutMutation = useMutation({
    mutationFn: validatePaymentAction,
    onSuccess: async (cart) => {
      setLocalError(null)
      queryClient.setQueryData(CART_KEY, cart)
      if (cart.paymentReady && cart.nextPath) {
        navigate(cart.nextPath)
        return
      }
      if (cart.itemsUpdatedMessage) {
        setLocalError(cart.itemsUpdatedMessage)
      } else if (cart.issues[0]) {
        setLocalError(cart.issues[0].message)
      }
    },
    onError: (error: unknown) => setLocalError(mapCarrinhoError(error)),
  })

  const busy =
    addMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending ||
    customerMutation.isPending ||
    discountMutation.isPending ||
    clearMutation.isPending ||
    checkoutMutation.isPending

  const cart = cartQuery.data ?? null
  const error =
    localError ??
    (cartQuery.error ? mapCarrinhoError(cartQuery.error) : null)

  return (
    <CarrinhoPage
      cart={cart}
      loading={cartQuery.isLoading}
      busy={busy}
      error={error}
      productDialogOpen={productDialogOpen}
      customerDialogOpen={customerDialogOpen}
      productSearch={productSearchDraft}
      customerSearch={customerSearchDraft}
      products={productsQuery.data?.items ?? []}
      productsLoading={productsQuery.isFetching}
      customers={customersQuery.data?.items ?? []}
      customersLoading={customersQuery.isFetching}
      cartDiscountDraft={discountValue}
      canAddItem={permissions.canAddItem}
      canEditQuantity={permissions.canEditQuantity}
      canRemoveItem={permissions.canRemoveItem}
      canApplyDiscount={permissions.canApplyDiscount}
      canSelectCustomer={permissions.canSelectCustomer}
      canCheckout={permissions.canCheckout}
      canClear={permissions.canClear}
      onOpenProducts={() => setProductDialogOpen(true)}
      onCloseProducts={() => setProductDialogOpen(false)}
      onOpenCustomers={() => setCustomerDialogOpen(true)}
      onCloseCustomers={() => setCustomerDialogOpen(false)}
      onProductSearchChange={setProductSearchDraft}
      onCustomerSearchChange={setCustomerSearchDraft}
      onAddProduct={(stockItemId) =>
        addMutation.mutate({ stockItemId, quantity: 1 })
      }
      onSelectCustomer={(customerId) => customerMutation.mutate(customerId)}
      onClearCustomer={() => customerMutation.mutate(null)}
      onQuantityChange={(lineId, quantity) =>
        updateMutation.mutate({ lineId, quantity })
      }
      onLineDiscountChange={(lineId, lineDiscount) =>
        updateMutation.mutate({ lineId, lineDiscount })
      }
      onRemoveItem={(lineId) => removeMutation.mutate(lineId)}
      onCartDiscountDraftChange={setCartDiscountDraft}
      onApplyCartDiscount={() => {
        const value = Number(
          discountValue.replace(',', '.').replace(/[^\d.-]/g, ''),
        )
        if (Number.isNaN(value) || value < 0) {
          setLocalError('Informe um desconto válido.')
          return
        }
        discountMutation.mutate(value)
      }}
      onClearCart={() => clearMutation.mutate()}
      onCheckout={() => checkoutMutation.mutate()}
      onRefresh={() => void cartQuery.refetch()}
    />
  )
}
