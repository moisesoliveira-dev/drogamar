import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  addCartItemAction,
  mapCarrinhoError,
  VENDAS_CARRINHO_QUERY_KEY,
} from '../../vendas-carrinho'
import { lookupBarcodeAction } from '../application/codigo-barras.actions'
import { CodigoBarrasPage } from '../components/CodigoBarrasPage'
import {
  resolveLookupStatus,
  vendasCodigoBarrasConfig,
} from '../domain/codigo-barras.schema'
import { mapCodigoBarrasError } from '../domain/errors'
import { useCodigoBarrasUiStore } from '../stores/codigo-barras.store'

function parseQuantity(raw: string): number | null {
  const value = Number(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(value) || value <= 0) return null
  return value
}

export function CodigoBarrasContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lookupSeq = useRef(0)

  const codeDraft = useCodigoBarrasUiStore((s) => s.codeDraft)
  const quantityDraft = useCodigoBarrasUiStore((s) => s.quantityDraft)
  const lastResult = useCodigoBarrasUiStore((s) => s.lastResult)
  const feedback = useCodigoBarrasUiStore((s) => s.feedback)
  const setCodeDraft = useCodigoBarrasUiStore((s) => s.setCodeDraft)
  const setQuantityDraft = useCodigoBarrasUiStore((s) => s.setQuantityDraft)
  const setLastResult = useCodigoBarrasUiStore((s) => s.setLastResult)
  const setFeedback = useCodigoBarrasUiStore((s) => s.setFeedback)
  const resetAfterAdd = useCodigoBarrasUiStore((s) => s.resetAfterAdd)

  const [localError, setLocalError] = useState<string | null>(null)
  const [searching, setSearching] = useState(false)

  const focusInput = useCallback(() => {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [])

  useEffect(() => {
    focusInput()
  }, [focusInput])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F2') return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        if (target === inputRef.current) return
      }
      event.preventDefault()
      focusInput()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [focusInput])

  const addMutation = useMutation({
    mutationFn: addCartItemAction,
    onSuccess: async (cart, variables) => {
      setLocalError(null)
      const line = cart.items.find((i) => i.stockItemId === variables.stockItemId)
      const qty = line?.quantity ?? variables.quantity ?? 1
      setFeedback(
        vendasCodigoBarrasConfig.mergeDuplicateScans
          ? `Adicionado ao carrinho · quantidade ${qty.toLocaleString('pt-BR')}`
          : 'Produto adicionado ao carrinho.',
      )
      resetAfterAdd()
      setLastResult(null)
      await queryClient.invalidateQueries({
        queryKey: VENDAS_CARRINHO_QUERY_KEY,
      })
      focusInput()
    },
    onError: (error: unknown) => {
      setFeedback(null)
      setLocalError(mapCarrinhoError(error))
      focusInput()
    },
  })

  const runLookup = async () => {
    const code = codeDraft.trim()
    if (!code || searching || addMutation.isPending) return

    const quantity = parseQuantity(quantityDraft)
    if (quantity == null) {
      setLocalError('Informe uma quantidade válida.')
      focusInput()
      return
    }

    const seq = ++lookupSeq.current
    setSearching(true)
    setLocalError(null)
    setFeedback(null)

    try {
      const result = await lookupBarcodeAction(code)
      if (seq !== lookupSeq.current) return

      const status = resolveLookupStatus(result)
      const product = result.product

      const shouldAutoAdd =
        vendasCodigoBarrasConfig.autoAddOnFound &&
        status === 'found' &&
        product?.canAdd

      if (shouldAutoAdd && product) {
        setLastResult(result)
        addMutation.mutate({ stockItemId: product.id, quantity })
        return
      }

      setLastResult(result)
      focusInput()
    } catch (error) {
      if (seq !== lookupSeq.current) return
      setLastResult(null)
      setLocalError(mapCodigoBarrasError(error))
      focusInput()
    } finally {
      if (seq === lookupSeq.current) setSearching(false)
    }
  }

  const onAddToCart = () => {
    const product = lastResult?.product
    if (!product?.canAdd) return
    const quantity = parseQuantity(quantityDraft)
    if (quantity == null) {
      setLocalError('Informe uma quantidade válida.')
      return
    }
    addMutation.mutate({ stockItemId: product.id, quantity })
  }

  return (
    <CodigoBarrasPage
      code={codeDraft}
      quantity={quantityDraft}
      result={lastResult}
      loading={searching}
      adding={addMutation.isPending}
      error={localError}
      feedback={feedback}
      canAdd
      onCodeChange={(value) => {
        setCodeDraft(value)
        setFeedback(null)
      }}
      onQuantityChange={setQuantityDraft}
      onSearch={() => void runLookup()}
      onAddToCart={onAddToCart}
      onGoToCart={() => navigate(vendasCodigoBarrasConfig.cartPath)}
      onInputRef={(el) => {
        inputRef.current = el
      }}
    />
  )
}
