import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  cancelReceivableAction,
  createReceivableAction,
  getDashboardAction,
  getLookupsAction,
  getReceivableAction,
  listReceivablesAction,
  registerReceiptAction,
  renegotiateAction,
  reverseReceiptAction,
  searchCustomersAction,
} from '../application/contas-receber.actions'
import { useContasReceberPermissions } from '../application/use-contas-receber-permissions'
import { mapContasReceberError } from '../domain/errors'
import { contasReceberConfig } from '../domain/contas-receber.schema'
import { ContasReceberPage } from '../components/ContasReceberPage'
import { useContasReceberStore } from '../stores/contas-receber.store'

const LIST_KEY = ['financeiro-contas-receber'] as const

export function ContasReceberContainer() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const permissions = useContasReceberPermissions()
  const store = useContasReceberStore()
  const [searchDraft, setSearchDraft] = useState(store.search)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [renegotiateOpen, setRenegotiateOpen] = useState(false)
  const [customerSearch, setCustomerSearch] = useState('')
  const [createForm, setCreateForm] = useState({
    customerId: '',
    description: '',
    document: '',
    originalAmount: '',
    issueDate: new Date().toISOString().slice(0, 10),
    dueDate: new Date().toISOString().slice(0, 10),
    paymentMethodId: '',
    bankAccountId: '',
    costCenterId: '',
    installmentCount: '1',
    notes: '',
  })
  const [receiveForm, setReceiveForm] = useState({
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

  useEffect(() => {
    const handle = window.setTimeout(() => store.setSearch(searchDraft), 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft, store])

  const filters = {
    search: store.search || undefined,
    status: store.status,
    period: store.period,
    customerId: store.customerId || undefined,
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
    queryFn: () => listReceivablesAction(filters),
  })

  const detailQuery = useQuery({
    queryKey: [...LIST_KEY, 'detail', store.selectedId],
    queryFn: () => getReceivableAction(store.selectedId!),
    enabled: Boolean(store.selectedId),
  })

  const customersQuery = useQuery({
    queryKey: [...LIST_KEY, 'customers', customerSearch],
    queryFn: () => searchCustomersAction(customerSearch || undefined),
    enabled: createOpen,
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: LIST_KEY })
  }

  const createMutation = useMutation({
    mutationFn: createReceivableAction,
    onSuccess: async (detail) => {
      setError(null)
      setCreateOpen(false)
      store.setSelectedId(detail.id)
      await invalidate()
    },
    onError: (e) => setError(mapContasReceberError(e)),
  })

  const receiveMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      registerReceiptAction(store.selectedId!, body),
    onSuccess: async () => {
      setError(null)
      setReceiveOpen(false)
      await invalidate()
    },
    onError: (e) => setError(mapContasReceberError(e)),
  })

  const reverseMutation = useMutation({
    mutationFn: ({
      movementId,
      reason,
    }: {
      movementId: string
      reason: string
    }) => reverseReceiptAction(store.selectedId!, movementId, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapContasReceberError(e)),
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
    onError: (e) => setError(mapContasReceberError(e)),
  })

  const cancelMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelReceivableAction(store.selectedId!, reason),
    onSuccess: async () => {
      setError(null)
      await invalidate()
    },
    onError: (e) => setError(mapContasReceberError(e)),
  })

  const busy =
    createMutation.isPending ||
    receiveMutation.isPending ||
    reverseMutation.isPending ||
    renegotiateMutation.isPending ||
    cancelMutation.isPending

  return (
    <ContasReceberPage
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
        (listQuery.error ? mapContasReceberError(listQuery.error) : null)
      }
      searchDraft={searchDraft}
      filters={{
        status: store.status,
        period: store.period,
        paymentMethodId: store.paymentMethodId,
        bankAccountId: store.bankAccountId,
        costCenterId: store.costCenterId,
        origin: store.origin,
      }}
      createOpen={createOpen}
      receiveOpen={receiveOpen}
      renegotiateOpen={renegotiateOpen}
      createForm={createForm}
      receiveForm={receiveForm}
      renegotiateForm={renegotiateForm}
      customers={customersQuery.data?.items ?? []}
      customerSearch={customerSearch}
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
      onCustomerSearchChange={setCustomerSearch}
      onSubmitCreate={() =>
        createMutation.mutate({
          customerId: createForm.customerId,
          description: createForm.description,
          document: createForm.document || null,
          originalAmount: Number(createForm.originalAmount.replace(',', '.')),
          issueDate: createForm.issueDate,
          dueDate: createForm.dueDate,
          paymentMethodId: createForm.paymentMethodId || null,
          bankAccountId: createForm.bankAccountId || null,
          costCenterId: createForm.costCenterId || null,
          installmentCount: Number(createForm.installmentCount) || 1,
          notes: createForm.notes || null,
          origin: 'MANUAL',
        })
      }
      onOpenReceive={() => {
        const detail = detailQuery.data
        setReceiveForm({
          amount: detail ? String(detail.balance) : '',
          paidAt: new Date().toISOString().slice(0, 10),
          paymentMethodId: detail?.paymentMethod?.id ?? '',
          bankAccountId: detail?.bankAccount?.id ?? '',
          discountAmount: '0',
          notes: '',
          idempotencyKey:
            typeof crypto !== 'undefined' && 'randomUUID' in crypto
              ? crypto.randomUUID()
              : `rcpt-${Date.now()}`,
        })
        setReceiveOpen(true)
      }}
      onCloseReceive={() => setReceiveOpen(false)}
      onReceiveFormChange={(key, value) =>
        setReceiveForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitReceive={() =>
        receiveMutation.mutate({
          amount: Number(receiveForm.amount.replace(',', '.')),
          paidAt: receiveForm.paidAt,
          paymentMethodId: receiveForm.paymentMethodId || null,
          bankAccountId: receiveForm.bankAccountId || null,
          discountAmount: Number(receiveForm.discountAmount.replace(',', '.')) || 0,
          notes: receiveForm.notes || null,
          idempotencyKey: receiveForm.idempotencyKey || null,
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
      onSendCollection={() => navigate(contasReceberConfig.cobrancasPath)}
      onRefresh={() => void invalidate()}
    />
  )
}
