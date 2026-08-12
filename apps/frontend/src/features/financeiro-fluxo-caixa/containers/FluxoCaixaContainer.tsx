import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelMovementAction,
  createMovementAction,
  createTransferAction,
  getAnalysisAction,
  getBalancesAction,
  getDashboardAction,
  getLookupsAction,
  getMovementAction,
  getProjectionAction,
  getSeriesAction,
  listMovementsAction,
  reverseMovementAction,
} from '../application/fluxo-caixa.actions'
import { useFluxoCaixaPermissions } from '../application/use-fluxo-caixa-permissions'
import { FluxoCaixaPage } from '../components/FluxoCaixaPage'
import { mapFluxoCaixaError } from '../domain/errors'
import { useFluxoCaixaStore } from '../stores/fluxo-caixa.store'

const LIST_KEY = ['financeiro-fluxo-caixa'] as const

export function FluxoCaixaContainer() {
  const queryClient = useQueryClient()
  const permissions = useFluxoCaixaPermissions()
  const store = useFluxoCaixaStore()
  const [searchDraft, setSearchDraft] = useState(store.search)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    direction: 'IN',
    amount: '',
    occurredAt: new Date().toISOString().slice(0, 10),
    description: '',
    bankAccountId: '',
    categoryId: '',
    costCenterId: '',
    notes: '',
  })
  const [transferForm, setTransferForm] = useState({
    amount: '',
    occurredAt: new Date().toISOString().slice(0, 10),
    fromBankAccountId: '',
    toBankAccountId: '',
    description: '',
  })

  useEffect(() => {
    const handle = window.setTimeout(() => store.setSearch(searchDraft), 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft, store])

  const filters = {
    search: store.search || undefined,
    period: store.period,
    from: store.from || undefined,
    to: store.to || undefined,
    direction: store.direction,
    status: store.status,
    bankAccountId: store.bankAccountId || undefined,
    categoryId: store.categoryId || undefined,
    costCenterId: store.costCenterId || undefined,
    origin: store.origin,
    page: store.page,
    pageSize: store.pageSize,
    groupBy: 'day' as const,
  }

  const projectionParams = {
    from: store.from || undefined,
    to: store.to || undefined,
    bankAccountId: store.bankAccountId || undefined,
    period: store.period,
  }

  const lookupsQuery = useQuery({
    queryKey: [...LIST_KEY, 'lookups'],
    queryFn: getLookupsAction,
    staleTime: 60_000,
  })

  const dashboardQuery = useQuery({
    queryKey: [...LIST_KEY, 'dashboard', filters],
    queryFn: () => getDashboardAction(filters),
  })

  const seriesQuery = useQuery({
    queryKey: [...LIST_KEY, 'series', filters],
    queryFn: () => getSeriesAction(filters),
  })

  const projectionQuery = useQuery({
    queryKey: [...LIST_KEY, 'projection', projectionParams],
    queryFn: async () => {
      const dash = dashboardQuery.data
      return getProjectionAction({
        from: store.from || dash?.from,
        to: store.to || dash?.to,
        bankAccountId: store.bankAccountId || undefined,
      })
    },
    enabled: Boolean(dashboardQuery.data),
  })

  const analysisQuery = useQuery({
    queryKey: [...LIST_KEY, 'analysis', filters],
    queryFn: () => getAnalysisAction({ ...filters, direction: 'OUT' }),
  })

  const balancesQuery = useQuery({
    queryKey: [...LIST_KEY, 'balances', filters],
    queryFn: () => getBalancesAction(filters),
  })

  const listQuery = useQuery({
    queryKey: [...LIST_KEY, 'list', filters],
    queryFn: () => listMovementsAction(filters),
  })

  const detailQuery = useQuery({
    queryKey: [...LIST_KEY, 'detail', store.selectedId],
    queryFn: () => getMovementAction(store.selectedId!),
    enabled: Boolean(store.selectedId),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: LIST_KEY })
  }

  const createMutation = useMutation({
    mutationFn: createMovementAction,
    onSuccess: async (detail) => {
      setError(null)
      setCreateOpen(false)
      store.setSelectedId(detail.id)
      await invalidate()
    },
    onError: (e) => setError(mapFluxoCaixaError(e)),
  })

  const transferMutation = useMutation({
    mutationFn: createTransferAction,
    onSuccess: async (detail) => {
      setError(null)
      setTransferOpen(false)
      store.setSelectedId(detail.id)
      await invalidate()
    },
    onError: (e) => setError(mapFluxoCaixaError(e)),
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelMovementAction(store.selectedId!, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapFluxoCaixaError(e)),
  })

  const reverseMutation = useMutation({
    mutationFn: (reason: string) =>
      reverseMovementAction(store.selectedId!, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapFluxoCaixaError(e)),
  })

  const busy =
    createMutation.isPending ||
    transferMutation.isPending ||
    cancelMutation.isPending ||
    reverseMutation.isPending

  const list = listQuery.data

  return (
    <FluxoCaixaPage
      items={list?.items ?? []}
      total={list?.total ?? 0}
      page={list?.page ?? store.page}
      pageSize={list?.pageSize ?? store.pageSize}
      totalPages={list?.totalPages ?? 1}
      dashboard={dashboardQuery.data ?? null}
      series={seriesQuery.data ?? null}
      projection={projectionQuery.data ?? null}
      analysis={analysisQuery.data ?? null}
      balances={balancesQuery.data ?? null}
      lookups={lookupsQuery.data ?? null}
      detail={detailQuery.data ?? null}
      detailLoading={detailQuery.isLoading}
      loading={listQuery.isLoading}
      busy={busy}
      error={
        error ??
        (listQuery.error
          ? mapFluxoCaixaError(listQuery.error)
          : dashboardQuery.error
            ? mapFluxoCaixaError(dashboardQuery.error)
            : null)
      }
      searchDraft={searchDraft}
      filters={{
        period: store.period,
        from: store.from,
        to: store.to,
        direction: store.direction,
        status: store.status,
        bankAccountId: store.bankAccountId,
        categoryId: store.categoryId,
        costCenterId: store.costCenterId,
        origin: store.origin,
      }}
      createOpen={createOpen}
      transferOpen={transferOpen}
      createForm={createForm}
      transferForm={transferForm}
      permissions={permissions}
      onSearchChange={setSearchDraft}
      onFilterChange={(key, value) => store.setFilter(key, value)}
      onClearFilters={() => {
        store.clearFilters()
        setSearchDraft('')
      }}
      onPageChange={(page) => store.setFilter('page', page)}
      onSelect={(id) => store.setSelectedId(id)}
      onCloseDetail={() => store.setSelectedId(null)}
      onOpenCreate={() => {
        const firstAccount = lookupsQuery.data?.bankAccounts[0]?.id ?? ''
        setCreateForm((prev) => ({
          ...prev,
          bankAccountId: prev.bankAccountId || firstAccount,
          occurredAt: new Date().toISOString().slice(0, 10),
        }))
        setCreateOpen(true)
      }}
      onCloseCreate={() => setCreateOpen(false)}
      onCreateFormChange={(key, value) =>
        setCreateForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitCreate={() => {
        createMutation.mutate({
          direction: createForm.direction,
          amount: Number(createForm.amount),
          occurredAt: createForm.occurredAt,
          description: createForm.description,
          bankAccountId: createForm.bankAccountId,
          categoryId: createForm.categoryId || null,
          costCenterId: createForm.costCenterId || null,
          notes: createForm.notes || null,
        })
      }}
      onOpenTransfer={() => {
        const accounts = lookupsQuery.data?.bankAccounts ?? []
        setTransferForm((prev) => ({
          ...prev,
          fromBankAccountId: prev.fromBankAccountId || accounts[0]?.id || '',
          toBankAccountId: prev.toBankAccountId || accounts[1]?.id || '',
          occurredAt: new Date().toISOString().slice(0, 10),
        }))
        setTransferOpen(true)
      }}
      onCloseTransfer={() => setTransferOpen(false)}
      onTransferFormChange={(key, value) =>
        setTransferForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitTransfer={() => {
        transferMutation.mutate({
          amount: Number(transferForm.amount),
          occurredAt: transferForm.occurredAt,
          fromBankAccountId: transferForm.fromBankAccountId,
          toBankAccountId: transferForm.toBankAccountId,
          description: transferForm.description || null,
        })
      }}
      onCancel={() => {
        const reason = window.prompt('Motivo do cancelamento:')
        if (!reason?.trim()) return
        cancelMutation.mutate(reason.trim())
      }}
      onReverse={() => {
        const reason = window.prompt('Motivo do estorno:')
        if (!reason?.trim()) return
        reverseMutation.mutate(reason.trim())
      }}
      onExport={() => {
        window.alert('Exportação de fluxo de caixa em breve.')
      }}
      onRefresh={() => {
        void invalidate()
      }}
    />
  )
}
