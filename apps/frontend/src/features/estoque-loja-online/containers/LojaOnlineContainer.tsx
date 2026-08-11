import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LojaOnlinePage } from '../components/LojaOnlinePage'
import {
  configureChannelAction,
  disconnectChannelAction,
  getLojaLookupsAction,
  getOverviewAction,
  getProductAction,
  getSyncJobAction,
  listProductsAction,
  listSyncJobsAction,
  publishProductAction,
  startSyncAction,
  unpublishProductAction,
  updateProductAction,
} from '../application/loja.actions'
import { useLojaPermissions } from '../application/use-loja-permissions'
import { LojaServiceError, mapLojaError } from '../domain/errors'
import type { StoreProductDetail } from '../domain/loja.schema'
import { useLojaStore } from '../stores/loja.store'

export function LojaOnlineContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const permissions = useLojaPermissions()

  const search = useLojaStore((s) => s.search)
  const status = useLojaStore((s) => s.status)
  const categoryId = useLojaStore((s) => s.categoryId)
  const brandId = useLojaStore((s) => s.brandId)
  const stock = useLojaStore((s) => s.stock)
  const sync = useLojaStore((s) => s.sync)
  const publish = useLojaStore((s) => s.publish)
  const page = useLojaStore((s) => s.page)
  const pageSize = useLojaStore((s) => s.pageSize)
  const selectedItemId = useLojaStore((s) => s.selectedItemId)
  const setSearch = useLojaStore((s) => s.setSearch)
  const setFilter = useLojaStore((s) => s.setFilter)
  const clearFilters = useLojaStore((s) => s.clearFilters)
  const setSelectedItemId = useLojaStore((s) => s.setSelectedItemId)

  const [searchDraft, setSearchDraft] = useState(search)
  const [configOpen, setConfigOpen] = useState(false)
  const [configName, setConfigName] = useState('Loja Online')
  const [configBaseUrl, setConfigBaseUrl] = useState('')
  const [configCredentials, setConfigCredentials] = useState('')
  const [syncDialogOpen, setSyncDialogOpen] = useState(false)
  const [syncOptions, setSyncOptions] = useState({
    syncProducts: true,
    syncStock: true,
    syncPrices: true,
  })
  const [activeSyncId, setActiveSyncId] = useState<string | null>(null)
  const [selectedDraft, setSelectedDraft] = useState<StoreProductDetail | null>(
    null,
  )
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => setSearch(searchDraft), 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft, setSearch])

  const overviewQuery = useQuery({
    queryKey: ['estoque-loja', 'overview'],
    queryFn: getOverviewAction,
  })

  const lookupsQuery = useQuery({
    queryKey: ['estoque-lookups'],
    queryFn: getLojaLookupsAction,
    staleTime: 60_000,
  })

  const productsQuery = useQuery({
    queryKey: [
      'estoque-loja',
      'products',
      search,
      status,
      categoryId,
      brandId,
      stock,
      sync,
      publish,
      page,
      pageSize,
    ],
    queryFn: () =>
      listProductsAction({
        search: search || undefined,
        status,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        stock,
        sync,
        publish,
        page,
        pageSize,
      }),
    enabled: Boolean(overviewQuery.data?.connected),
  })

  const historyQuery = useQuery({
    queryKey: ['estoque-loja', 'sync-history'],
    queryFn: () => listSyncJobsAction(1),
    enabled: Boolean(overviewQuery.data?.connected),
  })

  const productQuery = useQuery({
    queryKey: ['estoque-loja', 'product', selectedItemId],
    queryFn: () => getProductAction(selectedItemId!),
    enabled: Boolean(selectedItemId),
  })

  const selectedView = selectedDraft ?? productQuery.data ?? null

  const activeSyncQuery = useQuery({
    queryKey: ['estoque-loja', 'active-sync', activeSyncId],
    queryFn: () => getSyncJobAction(activeSyncId!),
    enabled: Boolean(activeSyncId),
    refetchInterval: (query) => {
      const st = query.state.data?.status
      if (st === 'PENDING' || st === 'PROCESSING') return 2000
      return false
    },
  })

  useEffect(() => {
    if (
      activeSyncQuery.data?.status === 'COMPLETED' ||
      activeSyncQuery.data?.status === 'COMPLETED_WITH_ERRORS' ||
      activeSyncQuery.data?.status === 'FAILED'
    ) {
      void queryClient.invalidateQueries({ queryKey: ['estoque-loja'] })
    }
  }, [activeSyncQuery.data?.status, queryClient])

  const configureMutation = useMutation({
    mutationFn: configureChannelAction,
    onSuccess: () => {
      setConfigOpen(false)
      setConfigCredentials('')
      void queryClient.invalidateQueries({ queryKey: ['estoque-loja'] })
    },
  })

  const disconnectMutation = useMutation({
    mutationFn: disconnectChannelAction,
    onSuccess: () => {
      setConfigOpen(false)
      void queryClient.invalidateQueries({ queryKey: ['estoque-loja'] })
    },
  })

  const saveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      updateProductAction(selectedItemId!, body),
    onSuccess: (data) => {
      setSelectedDraft(data)
      void queryClient.invalidateQueries({ queryKey: ['estoque-loja', 'products'] })
    },
  })

  const publishMutation = useMutation({
    mutationFn: () => publishProductAction(selectedItemId!),
    onSuccess: (data) => {
      setSelectedDraft(data)
      setLocalError(null)
      void queryClient.invalidateQueries({ queryKey: ['estoque-loja'] })
    },
    onError: (error) => {
      setLocalError(mapLojaError(error))
      if (error instanceof LojaServiceError && error.pendings) {
        void productQuery.refetch()
      }
    },
  })

  const unpublishMutation = useMutation({
    mutationFn: () => unpublishProductAction(selectedItemId!),
    onSuccess: (data) => {
      setSelectedDraft(data)
      void queryClient.invalidateQueries({ queryKey: ['estoque-loja'] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: startSyncAction,
    onSuccess: (job) => {
      setSyncDialogOpen(false)
      setActiveSyncId(job.id)
      void queryClient.invalidateQueries({
        queryKey: ['estoque-loja', 'sync-history'],
      })
    },
  })

  const error =
    localError ||
    (configureMutation.error ||
    disconnectMutation.error ||
    saveMutation.error ||
    publishMutation.error ||
    unpublishMutation.error ||
    syncMutation.error ||
    overviewQuery.error ||
    productsQuery.error
      ? mapLojaError(
          configureMutation.error ??
            disconnectMutation.error ??
            saveMutation.error ??
            publishMutation.error ??
            unpublishMutation.error ??
            syncMutation.error ??
            overviewQuery.error ??
            productsQuery.error,
        )
      : null)

  return (
    <LojaOnlinePage
      overview={overviewQuery.data ?? null}
      overviewLoading={overviewQuery.isLoading}
      products={productsQuery.data?.items ?? []}
      total={productsQuery.data?.total ?? 0}
      page={productsQuery.data?.page ?? page}
      pageSize={productsQuery.data?.pageSize ?? pageSize}
      totalPages={productsQuery.data?.totalPages ?? 1}
      productsLoading={productsQuery.isLoading}
      error={error}
      lookups={lookupsQuery.data ?? null}
      filters={{
        search: searchDraft,
        status,
        categoryId,
        brandId,
        stock,
        sync,
        publish,
      }}
      selected={selectedView}
      selectedLoading={Boolean(selectedItemId) && productQuery.isLoading}
      syncJobs={historyQuery.data?.items ?? []}
      activeSync={activeSyncQuery.data ?? null}
      syncDialogOpen={syncDialogOpen}
      syncOptions={syncOptions}
      configOpen={configOpen}
      configName={configName}
      configBaseUrl={configBaseUrl}
      configCredentials={configCredentials}
      saving={saveMutation.isPending || configureMutation.isPending}
      syncing={syncMutation.isPending}
      canConfigureChannel={permissions.canConfigureChannel}
      canSync={permissions.canSync}
      canPublish={permissions.canPublish}
      canUnpublish={permissions.canUnpublish}
      canConfigureProduct={permissions.canConfigureProduct}
      canChangePrice={permissions.canChangePrice}
      canExport={permissions.canExport}
      onSearchChange={setSearchDraft}
      onFilterChange={(key, value) => setFilter(key as 'status', value)}
      onClearFilters={() => {
        setSearchDraft('')
        clearFilters()
      }}
      onPageChange={(next) => setFilter('page', next)}
      onSelectProduct={(id) => {
        setSelectedDraft(null)
        setSelectedItemId(id)
      }}
      onCloseProduct={() => {
        setSelectedItemId(null)
        setSelectedDraft(null)
        setLocalError(null)
      }}
      onSaveProduct={(body) => saveMutation.mutate(body)}
      onPublish={() => publishMutation.mutate()}
      onUnpublish={() => unpublishMutation.mutate()}
      onOpenSync={() => setSyncDialogOpen(true)}
      onCloseSync={() => setSyncDialogOpen(false)}
      onSyncOptionChange={(key, value) =>
        setSyncOptions((prev) => ({ ...prev, [key]: value }))
      }
      onConfirmSync={() => syncMutation.mutate(syncOptions)}
      onOpenConfig={() => {
        const channel = overviewQuery.data?.channel
        setConfigName(channel?.name ?? 'Loja Online')
        setConfigBaseUrl(channel?.baseUrl ?? '')
        setConfigCredentials('')
        setConfigOpen(true)
      }}
      onCloseConfig={() => setConfigOpen(false)}
      onConfigNameChange={setConfigName}
      onConfigBaseUrlChange={setConfigBaseUrl}
      onConfigCredentialsChange={setConfigCredentials}
      onSaveConfig={() =>
        configureMutation.mutate({
          name: configName || 'Loja Online',
          platform: 'GENERIC',
          baseUrl: configBaseUrl || undefined,
          credentials: configCredentials || undefined,
        })
      }
      onDisconnect={() => disconnectMutation.mutate()}
      onExport={() =>
        navigate('/app/estoque/exportacao', {
          state: {
            type: 'ONLINE_STORE',
            format: 'XLSX',
            filters: {
              status: status === 'ALL' ? undefined : status,
              publish: publish === 'ALL' ? undefined : publish,
              sync: sync === 'ALL' ? undefined : sync,
              search: search || undefined,
            },
          },
        })
      }
      onRefresh={() => {
        void queryClient.invalidateQueries({ queryKey: ['estoque-loja'] })
      }}
      onSelectedFieldChange={(key, value) => {
        setSelectedDraft((prev) => {
          const base = prev ?? productQuery.data
          if (!base) return prev
          return { ...base, [key]: value } as StoreProductDetail
        })
      }}
    />
  )
}
