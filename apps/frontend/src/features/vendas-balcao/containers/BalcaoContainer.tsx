import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../auth'
import {
  addCartItemAction,
  clearCartAction,
  getCartAction,
  holdCartAction,
  listHeldCartsAction,
  removeCartItemAction,
  resumeHeldCartAction,
  searchCustomersAction,
  searchProductsAction,
  setCartCustomerAction,
  setCartDiscountAction,
  updateCartItemAction,
  validatePaymentAction,
  VENDAS_CARRINHO_QUERY_KEY,
} from '../../vendas-carrinho'
import { lookupBarcodeAction } from '../../vendas-codigo-barras'
import {
  closeCaixaAction,
  getCaixaAction,
  openCaixaAction,
  previewCloseCaixaAction,
} from '../application/caixa.actions'
import { BalcaoPage } from '../components/BalcaoPage'
import { vendasBalcaoConfig, type CashCloseSummary } from '../domain/balcao.schema'
import { mapBalcaoError } from '../domain/errors'
import { useBalcaoUiStore } from '../stores/balcao.store'

const CAIXA_KEY = ['vendas-caixa'] as const
const HELD_KEY = ['vendas-carrinho-held'] as const

function parseMoney(raw: string): number | null {
  const value = Number(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(value) || value < 0) return null
  return value
}

export function BalcaoContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const operatorName = useAuthStore((s) => s.user?.name ?? 'Operador')
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  )
  const [clock, setClock] = useState(() => new Date().toLocaleString('pt-BR'))
  const [closeSummary, setCloseSummary] = useState<CashCloseSummary | null>(
    null,
  )

  const searchDraft = useBalcaoUiStore((s) => s.searchDraft)
  const productDialogOpen = useBalcaoUiStore((s) => s.productDialogOpen)
  const customerDialogOpen = useBalcaoUiStore((s) => s.customerDialogOpen)
  const heldDialogOpen = useBalcaoUiStore((s) => s.heldDialogOpen)
  const closeDialogOpen = useBalcaoUiStore((s) => s.closeDialogOpen)
  const cancelSaleDialogOpen = useBalcaoUiStore((s) => s.cancelSaleDialogOpen)
  const openingAmount = useBalcaoUiStore((s) => s.openingAmount)
  const openingNotes = useBalcaoUiStore((s) => s.openingNotes)
  const selectedRegisterId = useBalcaoUiStore((s) => s.selectedRegisterId)
  const closingAmount = useBalcaoUiStore((s) => s.closingAmount)
  const closingNotes = useBalcaoUiStore((s) => s.closingNotes)
  const productSearch = useBalcaoUiStore((s) => s.productSearch)
  const customerSearch = useBalcaoUiStore((s) => s.customerSearch)
  const setSearchDraft = useBalcaoUiStore((s) => s.setSearchDraft)
  const setProductDialogOpen = useBalcaoUiStore((s) => s.setProductDialogOpen)
  const setCustomerDialogOpen = useBalcaoUiStore((s) => s.setCustomerDialogOpen)
  const setHeldDialogOpen = useBalcaoUiStore((s) => s.setHeldDialogOpen)
  const setCloseDialogOpen = useBalcaoUiStore((s) => s.setCloseDialogOpen)
  const setCancelSaleDialogOpen = useBalcaoUiStore(
    (s) => s.setCancelSaleDialogOpen,
  )
  const setOpeningAmount = useBalcaoUiStore((s) => s.setOpeningAmount)
  const setOpeningNotes = useBalcaoUiStore((s) => s.setOpeningNotes)
  const setSelectedRegisterId = useBalcaoUiStore((s) => s.setSelectedRegisterId)
  const setClosingAmount = useBalcaoUiStore((s) => s.setClosingAmount)
  const setClosingNotes = useBalcaoUiStore((s) => s.setClosingNotes)
  const setProductSearch = useBalcaoUiStore((s) => s.setProductSearch)
  const setCustomerSearch = useBalcaoUiStore((s) => s.setCustomerSearch)

  const [debouncedProductSearch, setDebouncedProductSearch] =
    useState(productSearch)
  const [debouncedCustomerSearch, setDebouncedCustomerSearch] =
    useState(customerSearch)

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedProductSearch(productSearch),
      300,
    )
    return () => window.clearTimeout(t)
  }, [productSearch])

  useEffect(() => {
    const t = window.setTimeout(
      () => setDebouncedCustomerSearch(customerSearch),
      300,
    )
    return () => window.clearTimeout(t)
  }, [customerSearch])

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const timer = window.setInterval(
      () => setClock(new Date().toLocaleString('pt-BR')),
      1000,
    )
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      window.clearInterval(timer)
    }
  }, [])

  const focusSearch = useCallback(() => {
    window.requestAnimationFrame(() => {
      searchRef.current?.focus()
      searchRef.current?.select()
    })
  }, [])

  useEffect(() => {
    focusSearch()
  }, [focusSearch])

  const caixaQuery = useQuery({
    queryKey: CAIXA_KEY,
    queryFn: getCaixaAction,
  })
  const caixaOpen = Boolean(caixaQuery.data?.open && caixaQuery.data.session)

  const cartQuery = useQuery({
    queryKey: VENDAS_CARRINHO_QUERY_KEY,
    queryFn: getCartAction,
    enabled: caixaOpen,
  })

  const productsQuery = useQuery({
    queryKey: ['vendas-balcao-produtos', debouncedProductSearch],
    queryFn: () => searchProductsAction(debouncedProductSearch || undefined),
    enabled: productDialogOpen && caixaOpen,
  })

  const customersQuery = useQuery({
    queryKey: ['vendas-balcao-clientes', debouncedCustomerSearch],
    queryFn: () => searchCustomersAction(debouncedCustomerSearch || undefined),
    enabled: customerDialogOpen && caixaOpen,
  })

  const heldQuery = useQuery({
    queryKey: HELD_KEY,
    queryFn: listHeldCartsAction,
    enabled: heldDialogOpen && caixaOpen,
  })

  const invalidateSale = async () => {
    await queryClient.invalidateQueries({ queryKey: VENDAS_CARRINHO_QUERY_KEY })
    await queryClient.invalidateQueries({ queryKey: HELD_KEY })
  }

  const mutationOptions = {
    onSuccess: async () => {
      setLocalError(null)
      await invalidateSale()
      focusSearch()
    },
    onError: (error: unknown) => setLocalError(mapBalcaoError(error)),
  }

  const addMutation = useMutation({
    mutationFn: addCartItemAction,
    ...mutationOptions,
    onSuccess: async () => {
      setLocalError(null)
      setProductDialogOpen(false)
      setSearchDraft('')
      await invalidateSale()
      focusSearch()
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
      setCustomerDialogOpen(false)
      setLocalError(null)
      await invalidateSale()
    },
  })

  const discountMutation = useMutation({
    mutationFn: setCartDiscountAction,
    ...mutationOptions,
  })

  const clearMutation = useMutation({
    mutationFn: clearCartAction,
    ...mutationOptions,
    onSuccess: async () => {
      setCancelSaleDialogOpen(false)
      setLocalError(null)
      await invalidateSale()
      focusSearch()
    },
  })

  const holdMutation = useMutation({
    mutationFn: holdCartAction,
    ...mutationOptions,
  })

  const resumeMutation = useMutation({
    mutationFn: resumeHeldCartAction,
    ...mutationOptions,
    onSuccess: async () => {
      setHeldDialogOpen(false)
      setLocalError(null)
      await invalidateSale()
      focusSearch()
    },
  })

  const openCaixaMutation = useMutation({
    mutationFn: openCaixaAction,
    onSuccess: async () => {
      setLocalError(null)
      await queryClient.invalidateQueries({ queryKey: CAIXA_KEY })
      focusSearch()
    },
    onError: (error: unknown) => setLocalError(mapBalcaoError(error)),
  })

  const closeCaixaMutation = useMutation({
    mutationFn: closeCaixaAction,
    onSuccess: async () => {
      setLocalError(null)
      setCloseDialogOpen(false)
      setCloseSummary(null)
      await queryClient.invalidateQueries({ queryKey: CAIXA_KEY })
      await queryClient.removeQueries({ queryKey: VENDAS_CARRINHO_QUERY_KEY })
    },
    onError: (error: unknown) => setLocalError(mapBalcaoError(error)),
  })

  const payMutation = useMutation({
    mutationFn: validatePaymentAction,
    onSuccess: (cart) => {
      setLocalError(null)
      queryClient.setQueryData(VENDAS_CARRINHO_QUERY_KEY, cart)
      if (cart.paymentReady) {
        navigate(vendasBalcaoConfig.paymentPath)
        return
      }
      setLocalError(
        cart.issues[0]?.message ?? 'Revise o carrinho antes de pagar.',
      )
    },
    onError: (error: unknown) => setLocalError(mapBalcaoError(error)),
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.key.startsWith('F') || event.key.length > 2) return
      const target = event.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      if (event.key === 'F2') {
        event.preventDefault()
        focusSearch()
        return
      }
      if (typing && target !== searchRef.current) return
      if (event.key === 'F3') {
        event.preventDefault()
        if (caixaOpen) payMutation.mutate()
        return
      }
      if (event.key === 'F1') {
        event.preventDefault()
        navigate(vendasBalcaoConfig.cartPath)
        return
      }
      if (event.key === 'F5') {
        event.preventDefault()
        navigate(vendasBalcaoConfig.aiSearchPath)
        return
      }
      if (event.key === 'F6') {
        event.preventDefault()
        navigate(vendasBalcaoConfig.discountsPath)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [caixaOpen, focusSearch, navigate, payMutation])

  const busy =
    addMutation.isPending ||
    updateMutation.isPending ||
    removeMutation.isPending ||
    customerMutation.isPending ||
    discountMutation.isPending ||
    clearMutation.isPending ||
    holdMutation.isPending ||
    resumeMutation.isPending ||
    openCaixaMutation.isPending ||
    closeCaixaMutation.isPending ||
    payMutation.isPending

  const error =
    localError ??
    (caixaQuery.error ? mapBalcaoError(caixaQuery.error) : null) ??
    (cartQuery.error ? mapBalcaoError(cartQuery.error) : null)

  const runSearch = async () => {
    const q = searchDraft.trim()
    if (!q || busy) return
    setLocalError(null)
    try {
      const lookup = await lookupBarcodeAction(q)
      if (lookup.found && lookup.product?.canAdd) {
        addMutation.mutate({ stockItemId: lookup.product.id, quantity: 1 })
        return
      }
      if (lookup.found && lookup.product && !lookup.product.canAdd) {
        if (lookup.product.unavailableReason === 'OUT_OF_STOCK') {
          setLocalError('Produto sem estoque')
        } else {
          setLocalError('Produto indisponível')
        }
        focusSearch()
        return
      }
      setProductSearch(q)
      setProductDialogOpen(true)
    } catch (err) {
      setLocalError(mapBalcaoError(err))
      focusSearch()
    }
  }

  return (
    <BalcaoPage
      online={online}
      clock={clock}
      operatorName={operatorName}
      caixaOpen={caixaOpen}
      session={caixaQuery.data?.session ?? null}
      registers={caixaQuery.data?.registers ?? []}
      selectedRegisterId={selectedRegisterId}
      openingAmount={openingAmount}
      openingNotes={openingNotes}
      cart={cartQuery.data ?? null}
      loading={cartQuery.isLoading || caixaQuery.isLoading}
      busy={busy}
      error={error}
      search={searchDraft}
      products={productsQuery.data?.items ?? []}
      productsLoading={productsQuery.isFetching}
      productDialogOpen={productDialogOpen}
      productSearch={productSearch}
      customers={customersQuery.data?.items ?? []}
      customersLoading={customersQuery.isFetching}
      customerDialogOpen={customerDialogOpen}
      customerSearch={customerSearch}
      held={heldQuery.data?.items ?? []}
      heldDialogOpen={heldDialogOpen}
      closeDialogOpen={closeDialogOpen}
      closeSummary={closeSummary}
      closingAmount={closingAmount}
      closingNotes={closingNotes}
      cancelSaleDialogOpen={cancelSaleDialogOpen}
      onSearchChange={setSearchDraft}
      onSearchSubmit={() => void runSearch()}
      onBindSearchInput={(el) => {
        searchRef.current = el
      }}
      onOpenProducts={() => setProductDialogOpen(true)}
      onCloseProducts={() => setProductDialogOpen(false)}
      onProductSearchChange={setProductSearch}
      onAddProduct={(stockItemId) =>
        addMutation.mutate({ stockItemId, quantity: 1 })
      }
      onOpenCustomers={() => setCustomerDialogOpen(true)}
      onCloseCustomers={() => setCustomerDialogOpen(false)}
      onCustomerSearchChange={setCustomerSearch}
      onSelectCustomer={(customerId) => customerMutation.mutate(customerId)}
      onClearCustomer={() => customerMutation.mutate(null)}
      onQuantityChange={(lineId, quantity) =>
        updateMutation.mutate({ lineId, quantity })
      }
      onLineDiscountChange={(lineId, lineDiscount) =>
        updateMutation.mutate({ lineId, lineDiscount })
      }
      onRemoveItem={(lineId) => removeMutation.mutate(lineId)}
      onCartDiscountChange={(value) => discountMutation.mutate(value)}
      onPay={() => payMutation.mutate()}
      onNewSale={() => clearMutation.mutate()}
      onAskCancelSale={() => setCancelSaleDialogOpen(true)}
      onCloseCancelSale={() => setCancelSaleDialogOpen(false)}
      onConfirmCancelSale={() => clearMutation.mutate()}
      onHold={() => holdMutation.mutate()}
      onOpenHeld={() => setHeldDialogOpen(true)}
      onCloseHeld={() => setHeldDialogOpen(false)}
      onResume={(cartId) => resumeMutation.mutate(cartId)}
      onOpenAiSearch={() => navigate(vendasBalcaoConfig.aiSearchPath)}
      onOpenDiscounts={() => navigate(vendasBalcaoConfig.discountsPath)}
      onSelectRegister={setSelectedRegisterId}
      onOpeningAmountChange={setOpeningAmount}
      onOpeningNotesChange={setOpeningNotes}
      onOpenCaixa={() => {
        const amount = parseMoney(openingAmount)
        if (amount == null) {
          setLocalError('Informe um fundo de caixa válido.')
          return
        }
        openCaixaMutation.mutate({
          registerId: selectedRegisterId ?? undefined,
          openingAmount: amount,
          notes: openingNotes.trim() || undefined,
        })
      }}
      onAskCloseCaixa={() => {
        void previewCloseCaixaAction()
          .then((preview) => {
            setCloseSummary(preview.summary)
            setClosingAmount(String(preview.summary.expectedAmount))
            setCloseDialogOpen(true)
          })
          .catch((err: unknown) => setLocalError(mapBalcaoError(err)))
      }}
      onCloseCloseDialog={() => setCloseDialogOpen(false)}
      onClosingAmountChange={setClosingAmount}
      onClosingNotesChange={setClosingNotes}
      onConfirmCloseCaixa={() => {
        const amount = parseMoney(closingAmount)
        if (amount == null) {
          setLocalError('Informe o valor de fechamento.')
          return
        }
        closeCaixaMutation.mutate({
          closingAmount: amount,
          notes: closingNotes.trim() || undefined,
        })
      }}
    />
  )
}
