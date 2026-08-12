import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  addCartItemAction,
  VENDAS_CARRINHO_QUERY_KEY,
} from '../../vendas-carrinho'
import {
  getBuscaIaStatusAction,
  searchBuscaIaAction,
} from '../application/busca-ia.actions'
import { BuscaIaPage } from '../components/BuscaIaPage'
import {
  vendasBuscaIaConfig,
  type BuscaIaItem,
  type BuscaIaResult,
  type BuscaIaUiState,
} from '../domain/busca-ia.schema'
import { mapBuscaIaError } from '../domain/errors'
import { useBuscaIaUiStore } from '../stores/busca-ia.store'

export function BuscaIaContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const draft = useBuscaIaUiStore((s) => s.draft)
  const setDraft = useBuscaIaUiStore((s) => s.setDraft)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BuscaIaResult | null>(null)

  const statusQuery = useQuery({
    queryKey: ['vendas-busca-ia-status'],
    queryFn: getBuscaIaStatusAction,
    staleTime: 60_000,
  })

  const searchMutation = useMutation({
    mutationFn: (query: string) => searchBuscaIaAction(query),
    onSuccess: (data) => {
      setError(null)
      setResult(data)
    },
    onError: (err: unknown) => {
      setResult(null)
      setError(mapBuscaIaError(err))
    },
  })

  const addMutation = useMutation({
    mutationFn: (item: BuscaIaItem) =>
      addCartItemAction({ stockItemId: item.id, quantity: 1 }),
    onSuccess: async () => {
      setError(null)
      await queryClient.invalidateQueries({
        queryKey: VENDAS_CARRINHO_QUERY_KEY,
      })
    },
    onError: (err: unknown) => setError(mapBuscaIaError(err)),
  })

  const state: BuscaIaUiState = useMemo(() => {
    if (searchMutation.isPending) return 'loading'
    if (error && !result) return 'error'
    if (result && result.total === 0) return 'empty'
    if (result) return 'results'
    if (draft.trim()) return 'typing'
    return 'idle'
  }, [draft, error, result, searchMutation.isPending])

  const runSearch = (value = draft) => {
    const query = value.trim()
    if (query.length < 2) {
      setError('Digite pelo menos 2 caracteres.')
      return
    }
    searchMutation.mutate(query)
  }

  return (
    <BuscaIaPage
      draft={draft}
      state={state}
      result={result}
      error={error}
      llmAvailable={statusQuery.data?.available ?? false}
      busy={searchMutation.isPending || addMutation.isPending}
      addingId={addMutation.isPending ? addMutation.variables?.id ?? null : null}
      onDraftChange={(value) => {
        setDraft(value)
        setError(null)
      }}
      onSearch={() => runSearch()}
      onExample={(value) => {
        setDraft(value)
        runSearch(value)
      }}
      onAdd={(item) => addMutation.mutate(item)}
      onTraditional={() => navigate(vendasBuscaIaConfig.traditionalPath)}
      onBalcao={() => navigate(vendasBuscaIaConfig.balcaoPath)}
    />
  )
}
