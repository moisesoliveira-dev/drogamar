import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { VENDAS_CARRINHO_QUERY_KEY } from '../../vendas-carrinho'
import {
  cancelPaymentAction,
  finalizePaymentAction,
  getPaymentSessionAction,
} from '../application/pagamento.actions'
import { PagamentosPage } from '../components/PagamentosPage'
import { mapPagamentoError } from '../domain/errors'
import {
  computeDraftSummary,
  roundMoney,
  vendasPagamentosConfig,
  type DraftPaymentLine,
} from '../domain/pagamento.schema'
import { usePagamentoUiStore } from '../stores/pagamento.store'

const SESSION_KEY = ['vendas-pagamentos-sessao'] as const

function parseMoney(raw: string): number | null {
  const value = Number(raw.replace(',', '.').replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(value) || value <= 0) return null
  return roundMoney(value)
}

export function PagamentosContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [localError, setLocalError] = useState<string | null>(null)

  const selectedMethod = usePagamentoUiStore((s) => s.selectedMethod)
  const amountDraft = usePagamentoUiStore((s) => s.amountDraft)
  const tenderedDraft = usePagamentoUiStore((s) => s.tenderedDraft)
  const lines = usePagamentoUiStore((s) => s.lines)
  const receipt = usePagamentoUiStore((s) => s.receipt)
  const cancelDialogOpen = usePagamentoUiStore((s) => s.cancelDialogOpen)
  const setSelectedMethod = usePagamentoUiStore((s) => s.setSelectedMethod)
  const setAmountDraft = usePagamentoUiStore((s) => s.setAmountDraft)
  const setTenderedDraft = usePagamentoUiStore((s) => s.setTenderedDraft)
  const addLine = usePagamentoUiStore((s) => s.addLine)
  const removeLine = usePagamentoUiStore((s) => s.removeLine)
  const setReceipt = usePagamentoUiStore((s) => s.setReceipt)
  const setCancelDialogOpen = usePagamentoUiStore((s) => s.setCancelDialogOpen)
  const ensureIdempotencyKey = usePagamentoUiStore((s) => s.ensureIdempotencyKey)
  const resetForNewSale = usePagamentoUiStore((s) => s.resetForNewSale)
  const hydrateMethod = usePagamentoUiStore((s) => s.hydrateMethod)

  const sessionQuery = useQuery({
    queryKey: SESSION_KEY,
    queryFn: getPaymentSessionAction,
    enabled: !receipt,
    retry: false,
  })

  useEffect(() => {
    if (!sessionQuery.data || receipt || selectedMethod) return
    hydrateMethod(
      sessionQuery.data.methods,
      sessionQuery.data.summary.total,
    )
  }, [sessionQuery.data, receipt, selectedMethod, hydrateMethod])

  const draft = useMemo(() => {
    const total = sessionQuery.data?.summary.total ?? 0
    return computeDraftSummary(total, lines)
  }, [sessionQuery.data?.summary.total, lines])

  const finalizeMutation = useMutation({
    mutationFn: finalizePaymentAction,
    onSuccess: async (data) => {
      setLocalError(null)
      setReceipt(data)
      await queryClient.invalidateQueries({ queryKey: VENDAS_CARRINHO_QUERY_KEY })
      await queryClient.removeQueries({ queryKey: SESSION_KEY })
    },
    onError: (error: unknown) => setLocalError(mapPagamentoError(error)),
  })

  const cancelMutation = useMutation({
    mutationFn: cancelPaymentAction,
    onSuccess: async () => {
      setLocalError(null)
      setCancelDialogOpen(false)
      resetForNewSale()
      await queryClient.invalidateQueries({ queryKey: VENDAS_CARRINHO_QUERY_KEY })
      await queryClient.removeQueries({ queryKey: SESSION_KEY })
      navigate(vendasPagamentosConfig.cartPath)
    },
    onError: (error: unknown) => setLocalError(mapPagamentoError(error)),
  })

  const busy = finalizeMutation.isPending || cancelMutation.isPending
  const session = sessionQuery.data ?? null
  const methods = session?.methods ?? []
  const error =
    localError ??
    (sessionQuery.error ? mapPagamentoError(sessionQuery.error) : null)

  const onAddPayment = () => {
    setLocalError(null)
    const method = methods.find((m) => m.code === selectedMethod)
    if (!method) {
      setLocalError('Selecione uma forma de pagamento.')
      return
    }
    const amount = parseMoney(amountDraft)
    if (amount == null) {
      setLocalError('Informe um valor válido.')
      return
    }
    if (amount - draft.remaining > 0.0001) {
      setLocalError('O valor informado excede o restante da venda.')
      return
    }

    let tenderedAmount: number | null = null
    let changeAmount = 0
    if (method.supportsChange) {
      const tendered = parseMoney(tenderedDraft)
      if (tendered == null) {
        setLocalError('Informe o valor recebido.')
        return
      }
      if (tendered + 0.0001 < amount) {
        setLocalError('Valor recebido insuficiente.')
        return
      }
      tenderedAmount = tendered
      changeAmount = roundMoney(tendered - amount)
    }

    const line: DraftPaymentLine = {
      id: crypto.randomUUID?.() ?? `line-${Date.now()}`,
      method: method.code,
      methodLabel: method.label,
      amount,
      tenderedAmount,
      changeAmount,
    }
    addLine(line)
    const nextRemaining = roundMoney(draft.remaining - amount)
    setAmountDraft(nextRemaining > 0 ? String(nextRemaining) : '')
    setTenderedDraft(nextRemaining > 0 ? String(nextRemaining) : '')
  }

  const onFinalize = () => {
    if (!draft.canComplete || lines.length === 0) {
      setLocalError(
        draft.remaining > 0
          ? `Restante: R$ ${draft.remaining.toFixed(2)}`
          : 'Informe ao menos um pagamento.',
      )
      return
    }
    if (
      !vendasPagamentosConfig.allowPartialPayment &&
      draft.remaining > 0.0001
    ) {
      setLocalError(`Restante: R$ ${draft.remaining.toFixed(2)}`)
      return
    }

    const key = ensureIdempotencyKey()
    finalizeMutation.mutate({
      idempotencyKey: key,
      payments: lines.map((line) => ({
        method: line.method,
        amount: line.amount,
        ...(line.tenderedAmount != null
          ? { tenderedAmount: line.tenderedAmount }
          : {}),
      })),
    })
  }

  return (
    <PagamentosPage
      session={session}
      loading={sessionQuery.isLoading || sessionQuery.isFetching}
      busy={busy}
      error={error}
      methods={methods}
      selectedMethod={selectedMethod}
      amountDraft={amountDraft}
      tenderedDraft={tenderedDraft}
      lines={lines}
      amountPaid={draft.amountPaid}
      remaining={draft.remaining}
      changeAmount={draft.changeAmount}
      canComplete={draft.canComplete}
      receipt={receipt}
      cancelDialogOpen={cancelDialogOpen}
      onSelectMethod={(code) => {
        setSelectedMethod(code)
        setLocalError(null)
      }}
      onAmountChange={setAmountDraft}
      onTenderedChange={setTenderedDraft}
      onAddPayment={onAddPayment}
      onRemovePayment={(id) => {
        const removed = lines.find((line) => line.id === id)
        removeLine(id)
        if (!removed) return
        const nextRemaining = roundMoney(draft.remaining + removed.amount)
        setAmountDraft(nextRemaining > 0 ? String(nextRemaining) : '')
        setTenderedDraft(nextRemaining > 0 ? String(nextRemaining) : '')
      }}
      onFinalize={onFinalize}
      onAskCancel={() => setCancelDialogOpen(true)}
      onCloseCancel={() => setCancelDialogOpen(false)}
      onConfirmCancel={() => cancelMutation.mutate()}
      onPrint={() => window.print()}
      onNewSale={() => {
        resetForNewSale()
        navigate(vendasPagamentosConfig.cartPath)
      }}
      onRefresh={() => {
        setLocalError(null)
        void sessionQuery.refetch()
      }}
    />
  )
}
