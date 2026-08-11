import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getLotDetailAction,
  getValidadeLookupsAction,
  listExpiryAlertsAction,
  mapValidadeError,
} from '../application/validade.actions'
import { useValidadePermissions } from '../application/use-validade-permissions'
import { ExpiryAlertsPage } from '../components/ExpiryAlertsPage'
import type { LotDetail } from '../domain/expiry.schema'
import { useValidadeStore } from '../stores/validade.store'

export function ExpiryAlertsContainer() {
  const navigate = useNavigate()
  const permissions = useValidadePermissions()
  const alertWindowDays = useValidadeStore((s) => s.alertWindowDays)
  const status = useValidadeStore((s) => s.status)
  const search = useValidadeStore((s) => s.search)
  const categoryId = useValidadeStore((s) => s.categoryId)
  const brandId = useValidadeStore((s) => s.brandId)
  const lotNumber = useValidadeStore((s) => s.lotNumber)
  const locationId = useValidadeStore((s) => s.locationId)
  const expiryFrom = useValidadeStore((s) => s.expiryFrom)
  const expiryTo = useValidadeStore((s) => s.expiryTo)
  const onlyWithQuantity = useValidadeStore((s) => s.onlyWithQuantity)
  const page = useValidadeStore((s) => s.page)
  const pageSize = useValidadeStore((s) => s.pageSize)
  const sortBy = useValidadeStore((s) => s.sortBy)
  const sortDir = useValidadeStore((s) => s.sortDir)
  const draft = useValidadeStore((s) => s.draft)
  const setDraft = useValidadeStore((s) => s.setDraft)
  const applyDraft = useValidadeStore((s) => s.applyDraft)
  const clearFilters = useValidadeStore((s) => s.clearFilters)
  const setPage = useValidadeStore((s) => s.setPage)
  const toggleSort = useValidadeStore((s) => s.toggleSort)
  const setAlertWindowDays = useValidadeStore((s) => s.setAlertWindowDays)

  const [lotId, setLotId] = useState<string | null>(null)

  const alertsQuery = useQuery({
    queryKey: [
      'estoque-validade',
      alertWindowDays,
      status,
      search,
      categoryId,
      brandId,
      lotNumber,
      locationId,
      expiryFrom,
      expiryTo,
      onlyWithQuantity,
      page,
      pageSize,
      sortBy,
      sortDir,
    ],
    queryFn: () =>
      listExpiryAlertsAction({
        alertWindowDays,
        status: status || 'ATTENTION',
        search: search || undefined,
        categoryId: categoryId || undefined,
        brandId: brandId || undefined,
        lotNumber: lotNumber || undefined,
        locationId: locationId || undefined,
        expiryFrom: expiryFrom || undefined,
        expiryTo: expiryTo || undefined,
        onlyWithQuantity: onlyWithQuantity || undefined,
        page,
        pageSize,
        sortBy,
        sortDir,
      }),
  })

  const lookupsQuery = useQuery({
    queryKey: ['estoque-lookups-lite'],
    queryFn: getValidadeLookupsAction,
    staleTime: 60_000,
  })

  const lotQuery = useQuery({
    queryKey: ['estoque-lot', lotId, alertWindowDays],
    queryFn: () => getLotDetailAction(lotId!, alertWindowDays),
    enabled: Boolean(lotId),
  })

  const lotDetail: LotDetail | null = lotQuery.data ?? null

  return (
    <ExpiryAlertsPage
      items={alertsQuery.data?.items ?? []}
      summary={alertsQuery.data?.summary ?? null}
      total={alertsQuery.data?.total ?? 0}
      page={alertsQuery.data?.page ?? page}
      pageSize={alertsQuery.data?.pageSize ?? pageSize}
      totalPages={alertsQuery.data?.totalPages ?? 1}
      loading={alertsQuery.isFetching}
      error={alertsQuery.error ? mapValidadeError(alertsQuery.error) : null}
      lookups={lookupsQuery.data ?? null}
      draft={{
        alertWindowDays: draft.alertWindowDays,
        status: draft.status,
        search: draft.search,
        categoryId: draft.categoryId,
        brandId: draft.brandId,
        lotNumber: draft.lotNumber,
        locationId: draft.locationId,
        expiryFrom: draft.expiryFrom,
        expiryTo: draft.expiryTo,
        onlyWithQuantity: draft.onlyWithQuantity,
      }}
      sortBy={sortBy}
      sortDir={sortDir}
      lotDetail={lotDetail}
      lotLoading={Boolean(lotId) && lotQuery.isLoading}
      canConfigureWindow={permissions.canConfigureWindow}
      onDraftChange={(key, value) => {
        setDraft(key as 'status', value as never)
      }}
      onApplyFilters={applyDraft}
      onClearFilters={clearFilters}
      onSortChange={toggleSort}
      onPageChange={setPage}
      onRefresh={() => {
        void alertsQuery.refetch()
      }}
      onRetry={() => {
        void alertsQuery.refetch()
      }}
      onViewItem={(itemId) => navigate(`/app/estoque/itens/${itemId}`)}
      onViewLot={setLotId}
      onCloseLot={() => setLotId(null)}
      onAlertWindowChange={setAlertWindowDays}
    />
  )
}
