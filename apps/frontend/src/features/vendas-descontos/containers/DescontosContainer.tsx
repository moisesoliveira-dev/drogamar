import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ZodError } from 'zod'
import { searchProductsAction } from '../../vendas-carrinho'
import {
  activatePromocaoAction,
  cancelPromocaoAction,
  deletePromocaoAction,
  getDashboardAction,
  getLookupsAction,
  getPromocaoAction,
  listPromocoesAction,
  pausePromocaoAction,
  savePromocaoAction,
  simulatePromocaoAction,
} from '../application/promocao.actions'
import { useDescontosPermissions } from '../application/use-descontos-permissions'
import { DescontosPage } from '../components/DescontosPage'
import { mapPromocaoError } from '../domain/errors'
import {
  emptyPromotionForm,
  detailToForm,
  promotionFormSchema,
  type PromotionFormValues,
} from '../domain/promocao.schema'
import {
  VENDAS_DESCONTOS_DASHBOARD_KEY,
  VENDAS_DESCONTOS_LOOKUPS_KEY,
  VENDAS_DESCONTOS_QUERY_KEY,
} from '../domain/query-keys'
import { useDescontosUiStore } from '../stores/descontos.store'

export function DescontosContainer() {
  const queryClient = useQueryClient()
  const search = useDescontosUiStore((s) => s.search)
  const status = useDescontosUiStore((s) => s.status)
  const formOpen = useDescontosUiStore((s) => s.formOpen)
  const simulateOpen = useDescontosUiStore((s) => s.simulateOpen)
  const filtersOpen = useDescontosUiStore((s) => s.filtersOpen)
  const editingId = useDescontosUiStore((s) => s.editingId)
  const setSearch = useDescontosUiStore((s) => s.setSearch)
  const setStatus = useDescontosUiStore((s) => s.setStatus)
  const openCreate = useDescontosUiStore((s) => s.openCreate)
  const openEdit = useDescontosUiStore((s) => s.openEdit)
  const closeForm = useDescontosUiStore((s) => s.closeForm)
  const setSimulateOpen = useDescontosUiStore((s) => s.setSimulateOpen)
  const setFiltersOpen = useDescontosUiStore((s) => s.setFiltersOpen)

  const [searchDraft, setSearchDraft] = useState(search)
  const [formDraft, setFormDraft] = useState<PromotionFormValues | null>(null)
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof PromotionFormValues, string>>
  >({})
  const [productSearch, setProductSearch] = useState('')
  const [simulateProductSearch, setSimulateProductSearch] = useState('')
  const [simulateProductId, setSimulateProductId] = useState('')
  const [simulateQty, setSimulateQty] = useState('1')
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchDraft), 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft, setSearch])

  const listQuery = useQuery({
    queryKey: [...VENDAS_DESCONTOS_QUERY_KEY, search, status],
    queryFn: () =>
      listPromocoesAction({
        search: search || undefined,
        status: status || undefined,
      }),
  })

  const dashboardQuery = useQuery({
    queryKey: VENDAS_DESCONTOS_DASHBOARD_KEY,
    queryFn: getDashboardAction,
  })

  const lookupsQuery = useQuery({
    queryKey: VENDAS_DESCONTOS_LOOKUPS_KEY,
    queryFn: getLookupsAction,
  })

  const detailQuery = useQuery({
    queryKey: ['vendas-descontos-detail', editingId],
    queryFn: () => getPromocaoAction(editingId!),
    enabled: Boolean(editingId) && formOpen,
  })

  const form: PromotionFormValues =
    formDraft ??
    (editingId && detailQuery.data
      ? detailToForm(detailQuery.data)
      : emptyPromotionForm())

  const productsQuery = useQuery({
    queryKey: ['vendas-descontos-produtos', productSearch],
    queryFn: () => searchProductsAction(productSearch || undefined),
    enabled: formOpen && form.scope === 'PRODUCTS',
  })

  const simulateProductsQuery = useQuery({
    queryKey: ['vendas-descontos-sim-produtos', simulateProductSearch],
    queryFn: () => searchProductsAction(simulateProductSearch || undefined),
    enabled: simulateOpen,
  })

  const permissions = useDescontosPermissions(
    listQuery.data?.permissions ?? dashboardQuery.data?.permissions,
  )

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: VENDAS_DESCONTOS_QUERY_KEY }),
      queryClient.invalidateQueries({
        queryKey: VENDAS_DESCONTOS_DASHBOARD_KEY,
      }),
    ])
  }

  const saveMutation = useMutation({
    mutationFn: () => savePromocaoAction(form, editingId ?? undefined),
    onSuccess: async () => {
      setLocalError(null)
      setFormDraft(null)
      closeForm()
      await invalidate()
    },
    onError: (error: unknown) => setLocalError(mapPromocaoError(error)),
  })

  const activateMutation = useMutation({
    mutationFn: activatePromocaoAction,
    onSuccess: invalidate,
    onError: (error: unknown) => setLocalError(mapPromocaoError(error)),
  })
  const pauseMutation = useMutation({
    mutationFn: pausePromocaoAction,
    onSuccess: invalidate,
    onError: (error: unknown) => setLocalError(mapPromocaoError(error)),
  })
  const cancelMutation = useMutation({
    mutationFn: cancelPromocaoAction,
    onSuccess: invalidate,
    onError: (error: unknown) => setLocalError(mapPromocaoError(error)),
  })
  const deleteMutation = useMutation({
    mutationFn: deletePromocaoAction,
    onSuccess: invalidate,
    onError: (error: unknown) => setLocalError(mapPromocaoError(error)),
  })
  const simulateMutation = useMutation({
    mutationFn: simulatePromocaoAction,
    onError: (error: unknown) => setLocalError(mapPromocaoError(error)),
  })

  const busy =
    saveMutation.isPending ||
    activateMutation.isPending ||
    pauseMutation.isPending ||
    cancelMutation.isPending ||
    deleteMutation.isPending ||
    simulateMutation.isPending

  const error =
    localError ??
    (listQuery.error ? mapPromocaoError(listQuery.error) : null)

  const selectedSimulateProducts = useMemo(
    () => simulateProductsQuery.data?.items ?? [],
    [simulateProductsQuery.data],
  )

  return (
    <DescontosPage
      dashboard={dashboardQuery.data ?? null}
      items={listQuery.data?.items ?? []}
      loading={listQuery.isLoading}
      busy={busy}
      error={error}
      search={searchDraft}
      status={status}
      filtersOpen={filtersOpen}
      formOpen={formOpen}
      form={form}
      formErrors={formErrors}
      editingId={editingId}
      detail={detailQuery.data ?? null}
      lookups={lookupsQuery.data ?? null}
      products={productsQuery.data?.items ?? []}
      productSearch={productSearch}
      productsLoading={productsQuery.isFetching}
      simulateOpen={simulateOpen}
      simulateProductSearch={simulateProductSearch}
      simulateProducts={selectedSimulateProducts}
      simulateProductId={simulateProductId}
      simulateQty={simulateQty}
      simulateResult={simulateMutation.data ?? null}
      canCreate={permissions.canCreate}
      canEdit={permissions.canEdit}
      canActivate={permissions.canActivate}
      canPause={permissions.canPause}
      canCancel={permissions.canCancel}
      canDelete={permissions.canDelete}
      onSearchChange={setSearchDraft}
      onStatusChange={setStatus}
      onOpenFilters={() => setFiltersOpen(true)}
      onCloseFilters={() => setFiltersOpen(false)}
      onOpenCreate={() => {
        setFormDraft(emptyPromotionForm())
        setFormErrors({})
        openCreate()
      }}
      onOpenEdit={(id) => {
        setFormDraft(null)
        setFormErrors({})
        openEdit(id)
      }}
      onCloseForm={() => {
        setFormDraft(null)
        closeForm()
      }}
      onFormChange={(patch) =>
        setFormDraft((prev) => ({ ...(prev ?? form), ...patch }))
      }
      onToggleTarget={(id) =>
        setFormDraft((prev) => {
          const current = prev ?? form
          return {
            ...current,
            targetIds: current.targetIds.includes(id)
              ? current.targetIds.filter((item) => item !== id)
              : [...current.targetIds, id],
          }
        })
      }
      onProductSearchChange={setProductSearch}
      onSave={() => {
        const parsed = promotionFormSchema.safeParse(form)
        if (!parsed.success) {
          const next: Partial<Record<keyof PromotionFormValues, string>> = {}
          if (parsed.error instanceof ZodError) {
            for (const issue of parsed.error.issues) {
              const key = issue.path[0]
              if (typeof key === 'string' && !(key in next)) {
                next[key as keyof PromotionFormValues] = issue.message
              }
            }
          }
          setFormErrors(next)
          return
        }
        setFormErrors({})
        saveMutation.mutate()
      }}
      onActivate={(id) => activateMutation.mutate(id)}
      onPause={(id) => pauseMutation.mutate(id)}
      onCancelPromo={(id) => cancelMutation.mutate(id)}
      onDelete={(id) => deleteMutation.mutate(id)}
      onOpenSimulate={() => {
        simulateMutation.reset()
        setSimulateOpen(true)
      }}
      onCloseSimulate={() => setSimulateOpen(false)}
      onSimulateProductSearchChange={setSimulateProductSearch}
      onSimulateProductIdChange={setSimulateProductId}
      onSimulateQtyChange={setSimulateQty}
      onSimulate={() => {
        const qty = Number(simulateQty.replace(',', '.'))
        if (!simulateProductId || !Number.isFinite(qty) || qty <= 0) {
          setLocalError('Informe produto e quantidade para simular.')
          return
        }
        simulateMutation.mutate({
          stockItemId: simulateProductId,
          quantity: qty,
        })
      }}
    />
  )
}
