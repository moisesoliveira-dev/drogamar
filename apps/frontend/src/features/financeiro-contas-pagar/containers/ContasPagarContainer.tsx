import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  approvePayableAction,
  cancelPayableAction,
  createPayableAction,
  getDashboardAction,
  getLookupsAction,
  getPayableAction,
  listPayablesAction,
  registerPaymentAction,
  rejectPayableAction,
  renegotiateAction,
  requestApprovalAction,
  reversePaymentAction,
  schedulePaymentAction,
  searchSuppliersAction,
} from '../application/contas-pagar.actions'
import { useContasPagarPermissions } from '../application/use-contas-pagar-permissions'
import { mapContasPagarError } from '../domain/errors'
import { ContasPagarPage } from '../components/ContasPagarPage'
import { useContasPagarStore } from '../stores/contas-pagar.store'

const LIST_KEY = ['financeiro-contas-pagar'] as const

export function ContasPagarContainer() {
  const queryClient = useQueryClient()
  const permissions = useContasPagarPermissions()
  const store = useContasPagarStore()
  const [searchDraft, setSearchDraft] = useState(store.search)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [renegotiateOpen, setRenegotiateOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [createForm, setCreateForm] = useState({
    supplierId: '',
    description: '',
    document: '',
    categoryId: '',
    originalAmount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    paymentMethodId: '',
    bankAccountId: '',
    costCenterId: '',
    installmentCount: '1',
    requiresApproval: 'false',
    notes: '',
  })
  const [payForm, setPayForm] = useState({
    amount: '',
    paidAt: new Date().toISOString().slice(0, 10),
    paymentMethodId: '',
    bankAccountId: '',
    discountAmount: '',
    notes: '',
    idempotencyKey: '',
  })
  const [renegotiateForm, setRenegotiateForm] = useState({
    installmentCount: '1',
    firstDueDate: new Date().toISOString().slice(0, 10),
    interestAmount: '0',
    discountAmount: '0',
    notes: '',
  })
  const [scheduleForm, setScheduleForm] = useState({
    scheduledDate: new Date().toISOString().slice(0, 10),
    amount: '',
    paymentMethodId: '',
    bankAccountId: '',
    notes: '',
  })

  useEffect(() => {
    const handle = window.setTimeout(() => store.setSearch(searchDraft), 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft, store])

  const filters = {
    search: store.search || undefined,
    status: store.status,
    period: store.period,
    supplierId: store.supplierId || undefined,
    categoryId: store.categoryId || undefined,
    paymentMethodId: store.paymentMethodId || undefined,
    bankAccountId: store.bankAccountId || undefined,
    costCenterId: store.costCenterId || undefined,
    origin: store.origin,
    page: store.page,
    pageSize: store.pageSize,
    sortBy: store.sortBy,
    sortDir: store.sortDir,
  }

  const lookupsQuery = useQuery({
    queryKey: [...LIST_KEY, 'lookups'],
    queryFn: getLookupsAction,
    staleTime: 60_000,
  })

  const dashboardQuery = useQuery({
    queryKey: [...LIST_KEY, 'dashboard', filters.period],
    queryFn: () => getDashboardAction(filters),
  })

  const listQuery = useQuery({
    queryKey: [...LIST_KEY, 'list', filters],
    queryFn: () => listPayablesAction(filters),
  })

  const detailQuery = useQuery({
    queryKey: [...LIST_KEY, 'detail', store.selectedId],
    queryFn: () => getPayableAction(store.selectedId!),
    enabled: Boolean(store.selectedId),
  })

  const suppliersQuery = useQuery({
    queryKey: [...LIST_KEY, 'suppliers', supplierSearch],
    queryFn: () => searchSuppliersAction(supplierSearch || undefined),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: LIST_KEY })
  }

  const createMutation = useMutation({
    mutationFn: createPayableAction,
    onSuccess: async (detail) => {
      setError(null)
      setCreateOpen(false)
      store.setSelectedId(detail.id)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const payMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      registerPaymentAction(store.selectedId!, body),
    onSuccess: async () => {
      setError(null)
      setPayOpen(false)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const reverseMutation = useMutation({
    mutationFn: ({
      movementId,
      reason,
    }: {
      movementId: string
      reason: string
    }) => reversePaymentAction(store.selectedId!, movementId, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const renegotiateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      renegotiateAction(store.selectedId!, body),
    onSuccess: async (detail) => {
      setError(null)
      setRenegotiateOpen(false)
      store.setSelectedId(detail.id)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelPayableAction(store.selectedId!, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const scheduleMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      schedulePaymentAction(store.selectedId!, body),
    onSuccess: async () => {
      setError(null)
      setScheduleOpen(false)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const requestApprovalMutation = useMutation({
    mutationFn: (reason?: string | null) =>
      requestApprovalAction(store.selectedId!, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const approveMutation = useMutation({
    mutationFn: (reason?: string | null) =>
      approvePayableAction(store.selectedId!, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      rejectPayableAction(store.selectedId!, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapContasPagarError(e)),
  })

  const busy =
    createMutation.isPending ||
    payMutation.isPending ||
    reverseMutation.isPending ||
    renegotiateMutation.isPending ||
    cancelMutation.isPending ||
    scheduleMutation.isPending ||
    requestApprovalMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending

  return (
    <ContasPagarPage
      items={listQuery.data?.items ?? []}
      total={listQuery.data?.total ?? 0}
      page={store.page}
      pageSize={store.pageSize}
      totalPages={listQuery.data?.totalPages ?? 1}
      dashboard={dashboardQuery.data ?? null}
      lookups={lookupsQuery.data ?? null}
      detail={detailQuery.data ?? null}
      detailLoading={detailQuery.isFetching}
      loading={listQuery.isLoading}
      busy={busy}
      error={
        error ??
        (listQuery.error ? mapContasPagarError(listQuery.error) : null)
      }
      searchDraft={searchDraft}
      filters={{
        status: store.status,
        period: store.period,
        supplierId: store.supplierId,
        categoryId: store.categoryId,
        paymentMethodId: store.paymentMethodId,
        bankAccountId: store.bankAccountId,
        costCenterId: store.costCenterId,
        origin: store.origin,
      }}
      createOpen={createOpen}
      payOpen={payOpen}
      renegotiateOpen={renegotiateOpen}
      scheduleOpen={scheduleOpen}
      createForm={createForm}
      payForm={payForm}
      renegotiateForm={renegotiateForm}
      scheduleForm={scheduleForm}
      suppliers={suppliersQuery.data?.items ?? []}
      supplierSearch={supplierSearch}
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
      onOpenCreate={() => setCreateOpen(true)}
      onCloseCreate={() => setCreateOpen(false)}
      onCreateFormChange={(key, value) =>
        setCreateForm((prev) => ({ ...prev, [key]: value }))
      }
      onSupplierSearchChange={setSupplierSearch}
      onSubmitCreate={() =>
        createMutation.mutate({
          supplierId: createForm.supplierId,
          description: createForm.description,
          document: createForm.document || null,
          categoryId: createForm.categoryId || null,
          originalAmount: Number(createForm.originalAmount.replace(',', '.')),
          issueDate: createForm.issueDate,
          dueDate: createForm.dueDate,
          paymentMethodId: createForm.paymentMethodId || null,
          bankAccountId: createForm.bankAccountId || null,
          costCenterId: createForm.costCenterId || null,
          installmentCount: Number(createForm.installmentCount) || 1,
          requiresApproval: createForm.requiresApproval === 'true',
          notes: createForm.notes || null,
          origin: 'MANUAL',
        })
      }
      onOpenPay={() => {
        const detail = detailQuery.data
        setPayForm({
          amount: detail ? String(detail.balance) : '',
          paidAt: new Date().toISOString().slice(0, 10),
          paymentMethodId: detail?.paymentMethod?.id ?? '',
          bankAccountId: detail?.bankAccount?.id ?? '',
          discountAmount: '0',
          notes: '',
          idempotencyKey:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `pay-${Date.now()}`,
        })
        setPayOpen(true)
      }}
      onClosePay={() => setPayOpen(false)}
      onPayFormChange={(key, value) =>
        setPayForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitPay={() =>
        payMutation.mutate({
          amount: Number(payForm.amount.replace(',', '.')),
          paidAt: payForm.paidAt,
          paymentMethodId: payForm.paymentMethodId || null,
          bankAccountId: payForm.bankAccountId || null,
          discountAmount: Number(payForm.discountAmount.replace(',', '.')) || 0,
          notes: payForm.notes || null,
          idempotencyKey: payForm.idempotencyKey || null,
        })
      }
      onReverse={(movementId) => {
        const reason = window.prompt('Motivo do estorno:')
        if (!reason?.trim()) return
        reverseMutation.mutate({ movementId, reason: reason.trim() })
      }}
      onOpenRenegotiate={() => setRenegotiateOpen(true)}
      onCloseRenegotiate={() => setRenegotiateOpen(false)}
      onRenegotiateFormChange={(key, value) =>
        setRenegotiateForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitRenegotiate={() =>
        renegotiateMutation.mutate({
          installmentCount: Number(renegotiateForm.installmentCount) || 1,
          firstDueDate: renegotiateForm.firstDueDate,
          interestAmount:
            Number(renegotiateForm.interestAmount.replace(',', '.')) || 0,
          discountAmount:
            Number(renegotiateForm.discountAmount.replace(',', '.')) || 0,
          notes: renegotiateForm.notes || null,
        })
      }
      onOpenSchedule={() => {
        const detail = detailQuery.data
        setScheduleForm({
          scheduledDate: new Date().toISOString().slice(0, 10),
          amount: detail ? String(detail.balance) : '',
          paymentMethodId: detail?.paymentMethod?.id ?? '',
          bankAccountId: detail?.bankAccount?.id ?? '',
          notes: '',
        })
        setScheduleOpen(true)
      }}
      onCloseSchedule={() => setScheduleOpen(false)}
      onScheduleFormChange={(key, value) =>
        setScheduleForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitSchedule={() =>
        scheduleMutation.mutate({
          scheduledDate: scheduleForm.scheduledDate,
          amount: Number(scheduleForm.amount.replace(',', '.')),
          paymentMethodId: scheduleForm.paymentMethodId || null,
          bankAccountId: scheduleForm.bankAccountId || null,
          notes: scheduleForm.notes || null,
        })
      }
      onRequestApproval={() => {
        const reason = window.prompt('Motivo / observação (opcional):') ?? ''
        requestApprovalMutation.mutate(reason.trim() || null)
      }}
      onApprove={() => {
        const reason = window.prompt('Observação da aprovação (opcional):') ?? ''
        approveMutation.mutate(reason.trim() || null)
      }}
      onReject={() => {
        const reason = window.prompt('Motivo da rejeição:')
        if (!reason?.trim()) return
        rejectMutation.mutate(reason.trim())
      }}
      onCancel={() => {
        const reason = window.prompt('Motivo do cancelamento:')
        if (!reason?.trim()) return
        cancelMutation.mutate(reason.trim())
      }}
      onExport={() => {
        setError(
          'Exportação financeira usará o mecanismo central (em breve). Por enquanto, use filtros e a listagem.',
        )
      }}
      onRefresh={() => void invalidate()}
    />
  )
}
