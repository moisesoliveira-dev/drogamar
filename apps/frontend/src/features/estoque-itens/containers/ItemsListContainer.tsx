import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  activateItemAction,
  deactivateItemAction,
  deleteItemAction,
  duplicateItemAction,
  getLookupsAction,
  listItemsAction,
  mapItemError,
} from '../application/items.actions'
import { useItemPermissions } from '../application/use-item-permissions'
import { ItemsListPage } from '../components/ItemsListPage'
import type { StockItem } from '../domain/item.schema'
import { useItemListStore } from '../stores/item-list.store'

export function ItemsListContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const permissions = useItemPermissions()
  const setSearch = useItemListStore((s) => s.setSearch)
  const setFilter = useItemListStore((s) => s.setFilter)
  const clearFilters = useItemListStore((s) => s.clearFilters)
  const toggleSort = useItemListStore((s) => s.toggleSort)
  const search = useItemListStore((s) => s.search)
  const status = useItemListStore((s) => s.status)
  const categoryId = useItemListStore((s) => s.categoryId)
  const brandId = useItemListStore((s) => s.brandId)
  const locationId = useItemListStore((s) => s.locationId)
  const measureUnitId = useItemListStore((s) => s.measureUnitId)
  const itemType = useItemListStore((s) => s.itemType)
  const page = useItemListStore((s) => s.page)
  const pageSize = useItemListStore((s) => s.pageSize)
  const sortBy = useItemListStore((s) => s.sortBy)
  const sortDir = useItemListStore((s) => s.sortDir)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<StockItem | null>(null)
  const [searchDraft, setSearchDraft] = useState(search)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchDraft)
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft, setSearch])

  const listQuery = useQuery({
    queryKey: [
      'estoque-itens',
      search,
      status,
      categoryId,
      brandId,
      locationId,
      measureUnitId,
      itemType,
      page,
      pageSize,
      sortBy,
      sortDir,
    ],
    queryFn: () =>
      listItemsAction({
        search: search || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        locationId: locationId || undefined,
        measureUnitId: measureUnitId || undefined,
        itemType: itemType || undefined,
        page,
        pageSize,
        sortBy,
        sortDir,
      }),
  })

  const lookupsQuery = useQuery({
    queryKey: ['estoque-lookups'],
    queryFn: getLookupsAction,
    staleTime: 60_000,
  })

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['estoque-itens'] })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateItemAction(id),
    onSuccess: (item) => {
      void invalidate()
      navigate(`/app/estoque/itens/${item.id}/editar`)
    },
  })

  const toggleMutation = useMutation({
    mutationFn: (item: StockItem) =>
      item.status === 'ACTIVE'
        ? deactivateItemAction(item.id)
        : activateItemAction(item.id),
    onSuccess: () => {
      setFlash('Status atualizado.')
      void invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteItemAction(id),
    onSuccess: () => {
      setDeleteTarget(null)
      setFlash('Item excluído.')
      void invalidate()
    },
  })

  const error =
    listQuery.error != null
      ? mapItemError(listQuery.error)
      : duplicateMutation.error
        ? mapItemError(duplicateMutation.error)
        : toggleMutation.error
          ? mapItemError(toggleMutation.error)
          : deleteMutation.error
            ? mapItemError(deleteMutation.error)
            : null

  return (
    <>
      {flash ? (
        <p
          role="status"
          style={{
            margin: '0 0 12px',
            color: 'var(--fm-success)',
            fontSize: 13,
          }}
        >
          {flash}
        </p>
      ) : null}
      <ItemsListPage
        items={listQuery.data?.items ?? []}
        total={listQuery.data?.total ?? 0}
        page={listQuery.data?.page ?? page}
        pageSize={listQuery.data?.pageSize ?? pageSize}
        totalPages={listQuery.data?.totalPages ?? 1}
        loading={listQuery.isLoading}
        error={error}
        lookups={lookupsQuery.data ?? null}
        filters={{
          search: searchDraft,
          status,
          categoryId,
          brandId,
          locationId,
          measureUnitId,
          itemType,
          sortBy,
          sortDir,
        }}
        selectedId={selectedId}
        deleteTarget={deleteTarget}
        deleting={deleteMutation.isPending}
        canCreate={permissions.canCreate}
        canEdit={permissions.canEdit}
        canDeactivate={permissions.canDeactivate}
        canDelete={permissions.canDelete}
        onSearchChange={setSearchDraft}
        onFilterChange={(key, value) => {
          setFilter(key as 'status', value)
        }}
        onClearFilters={() => {
          setSearchDraft('')
          clearFilters()
        }}
        onSortChange={toggleSort}
        onPageChange={(nextPage) => setFilter('page', nextPage)}
        onSelect={(item) => setSelectedId(item.id)}
        onCreate={() => navigate('/app/estoque/itens/novo')}
        onView={(item) => navigate(`/app/estoque/itens/${item.id}`)}
        onEdit={(item) => navigate(`/app/estoque/itens/${item.id}/editar`)}
        onDuplicate={(item) => duplicateMutation.mutate(item.id)}
        onToggleActive={(item) => toggleMutation.mutate(item)}
        onAskDelete={setDeleteTarget}
        onCancelDelete={() => setDeleteTarget(null)}
        onConfirmDelete={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id)
        }}
      />
    </>
  )
}
