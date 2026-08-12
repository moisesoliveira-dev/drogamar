import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  assignAction,
  cancelCaseAction,
  cancelPromiseAction,
  createCaseAction,
  createPromiseAction,
  getAgendaAction,
  getAgingAction,
  getCaseAction,
  getDashboardAction,
  getLookupsAction,
  listCasesAction,
  registerContactAction,
  resolveCaseAction,
  setNextActionAction,
} from '../application/cobrancas.actions'
import { useCobrancasPermissions } from '../application/use-cobrancas-permissions'
import { CobrancasPage } from '../components/CobrancasPage'
import { cobrancasConfig } from '../domain/cobrancas.schema'
import { mapCobrancasError } from '../domain/errors'
import { useCobrancasStore } from '../stores/cobrancas.store'

const LIST_KEY = ['financeiro-cobrancas'] as const

const today = () => new Date().toISOString().slice(0, 10)

export function CobrancasContainer() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const deepLinkReceivableId = searchParams.get('receivableId')
  const queryClient = useQueryClient()
  const permissions = useCobrancasPermissions()
  const store = useCobrancasStore()
  const [searchDraft, setSearchDraft] = useState(store.search)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(() => Boolean(deepLinkReceivableId))
  const [contactOpen, setContactOpen] = useState(false)
  const [promiseOpen, setPromiseOpen] = useState(false)
  const [nextActionOpen, setNextActionOpen] = useState(false)

  const [createForm, setCreateForm] = useState(() => ({
    customerId: '',
    receivableIds: deepLinkReceivableId ?? '',
    notes: deepLinkReceivableId ? 'Origem: Contas a Receber' : '',
  }))
  const [contactForm, setContactForm] = useState({
    channel: 'PHONE',
    outcome: 'ANSWERED',
    notes: '',
  })
  const [promiseForm, setPromiseForm] = useState({
    promisedAmount: '',
    promisedDate: today(),
    notes: '',
  })
  const [nextActionForm, setNextActionForm] = useState({
    nextAction: 'CALL',
    nextActionAt: '',
    notes: '',
  })

  useEffect(() => {
    const handle = window.setTimeout(() => store.setSearch(searchDraft), 300)
    return () => window.clearTimeout(handle)
  }, [searchDraft, store])

  useEffect(() => {
    if (!deepLinkReceivableId) return
    const next = new URLSearchParams(searchParams)
    if (!next.has('receivableId')) return
    next.delete('receivableId')
    setSearchParams(next, { replace: true })
  }, [deepLinkReceivableId, searchParams, setSearchParams])

  const filters = {
    search: store.search || undefined,
    status: store.status,
    financialStatus: store.financialStatus,
    daysBucket: store.daysBucket,
    assigneeId: store.assigneeId === 'ALL' ? undefined : store.assigneeId,
    period: store.period,
    page: store.page,
    pageSize: store.pageSize,
  }

  const lookupsQuery = useQuery({
    queryKey: [...LIST_KEY, 'lookups'],
    queryFn: getLookupsAction,
    staleTime: 60_000,
  })

  const dashboardQuery = useQuery({
    queryKey: [...LIST_KEY, 'dashboard', filters.period],
    queryFn: () => getDashboardAction(filters.period),
  })

  const agingQuery = useQuery({
    queryKey: [...LIST_KEY, 'aging'],
    queryFn: getAgingAction,
  })

  const agendaQuery = useQuery({
    queryKey: [...LIST_KEY, 'agenda'],
    queryFn: () => getAgendaAction('WEEK'),
  })

  const listQuery = useQuery({
    queryKey: [...LIST_KEY, 'list', filters],
    queryFn: () => listCasesAction(filters),
  })

  const detailQuery = useQuery({
    queryKey: [...LIST_KEY, 'detail', store.selectedId],
    queryFn: () => getCaseAction(store.selectedId!),
    enabled: Boolean(store.selectedId),
  })

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: LIST_KEY })
  }

  const createMutation = useMutation({
    mutationFn: createCaseAction,
    onSuccess: async (detail) => {
      setError(null)
      setCreateOpen(false)
      store.setSelectedId(detail.id)
      await invalidate()
    },
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const contactMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      registerContactAction(store.selectedId!, body),
    onSuccess: async () => {
      setContactOpen(false)
      await invalidate()
    },
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const promiseMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      createPromiseAction(store.selectedId!, body),
    onSuccess: async () => {
      setPromiseOpen(false)
      await invalidate()
    },
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const nextActionMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      setNextActionAction(store.selectedId!, body),
    onSuccess: async () => {
      setNextActionOpen(false)
      await invalidate()
    },
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const assignMutation = useMutation({
    mutationFn: (assigneeId: string | null) =>
      assignAction(store.selectedId!, assigneeId),
    onSuccess: async () => invalidate(),
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const cancelPromiseMutation = useMutation({
    mutationFn: (promiseId: string) =>
      cancelPromiseAction(store.selectedId!, promiseId),
    onSuccess: async () => invalidate(),
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const cancelCaseMutation = useMutation({
    mutationFn: (reason: string) =>
      cancelCaseAction(store.selectedId!, reason),
    onSuccess: async () => {
      store.setSelectedId(null)
      await invalidate()
    },
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const resolveMutation = useMutation({
    mutationFn: (body: { force?: boolean; reason?: string | null }) =>
      resolveCaseAction(store.selectedId!, body),
    onSuccess: async () => invalidate(),
    onError: (err) => setError(mapCobrancasError(err)),
  })

  const busy =
    createMutation.isPending ||
    contactMutation.isPending ||
    promiseMutation.isPending ||
    nextActionMutation.isPending ||
    assignMutation.isPending ||
    cancelPromiseMutation.isPending ||
    cancelCaseMutation.isPending ||
    resolveMutation.isPending

  const list = listQuery.data

  return (
    <CobrancasPage
      items={list?.items ?? []}
      total={list?.total ?? 0}
      page={list?.page ?? store.page}
      pageSize={list?.pageSize ?? store.pageSize}
      totalPages={list?.totalPages ?? 1}
      dashboard={dashboardQuery.data ?? null}
      aging={agingQuery.data ?? null}
      agenda={agendaQuery.data ?? null}
      lookups={lookupsQuery.data ?? null}
      detail={detailQuery.data ?? null}
      detailLoading={detailQuery.isLoading && Boolean(store.selectedId)}
      loading={listQuery.isLoading}
      busy={busy}
      error={
        error ||
        (listQuery.error ? mapCobrancasError(listQuery.error) : null)
      }
      searchDraft={searchDraft}
      filters={{
        status: store.status,
        financialStatus: store.financialStatus,
        daysBucket: store.daysBucket,
        assigneeId: store.assigneeId,
        period: store.period,
      }}
      createOpen={createOpen}
      contactOpen={contactOpen}
      promiseOpen={promiseOpen}
      nextActionOpen={nextActionOpen}
      createForm={createForm}
      contactForm={contactForm}
      promiseForm={promiseForm}
      nextActionForm={nextActionForm}
      permissions={permissions}
      onSearchChange={setSearchDraft}
      onFilterChange={(key, value) => store.setFilter(key, value)}
      onClearFilters={() => {
        store.clearFilters()
        setSearchDraft('')
      }}
      onSelect={(id) => store.setSelectedId(id)}
      onCloseDetail={() => store.setSelectedId(null)}
      onPageChange={(p) => store.setFilter('page', p)}
      onOpenCreate={() => setCreateOpen(true)}
      onCloseCreate={() => setCreateOpen(false)}
      onCreateFormChange={(key, value) =>
        setCreateForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitCreate={() => {
        const receivableIds = createForm.receivableIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        createMutation.mutate({
          customerId: createForm.customerId.trim() || undefined,
          receivableIds: receivableIds.length ? receivableIds : undefined,
          notes: createForm.notes || null,
        })
      }}
      onOpenContact={() => setContactOpen(true)}
      onCloseContact={() => setContactOpen(false)}
      onContactFormChange={(key, value) =>
        setContactForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitContact={() =>
        contactMutation.mutate({
          channel: contactForm.channel,
          outcome: contactForm.outcome,
          notes: contactForm.notes || null,
        })
      }
      onOpenPromise={() => setPromiseOpen(true)}
      onClosePromise={() => setPromiseOpen(false)}
      onPromiseFormChange={(key, value) =>
        setPromiseForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitPromise={() =>
        promiseMutation.mutate({
          promisedAmount:
            Number(promiseForm.promisedAmount.replace(',', '.')) || 0,
          promisedDate: promiseForm.promisedDate,
          notes: promiseForm.notes || null,
        })
      }
      onOpenNextAction={() => setNextActionOpen(true)}
      onCloseNextAction={() => setNextActionOpen(false)}
      onNextActionFormChange={(key, value) =>
        setNextActionForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitNextAction={() =>
        nextActionMutation.mutate({
          nextAction: nextActionForm.nextAction,
          nextActionAt: nextActionForm.nextActionAt
            ? new Date(nextActionForm.nextActionAt).toISOString()
            : null,
          notes: nextActionForm.notes || null,
        })
      }
      onAssign={(assigneeId) =>
        assignMutation.mutate(assigneeId ? assigneeId : null)
      }
      onCancelPromise={(promiseId) => cancelPromiseMutation.mutate(promiseId)}
      onCancelCase={() => {
        const reason = window.prompt('Motivo do cancelamento:')
        if (!reason?.trim()) return
        cancelCaseMutation.mutate(reason.trim())
      }}
      onResolveCase={() => {
        resolveMutation.mutate(
          {},
          {
            onError: (err) => {
              const mapped = mapCobrancasError(err)
              if (
                err instanceof Error &&
                'code' in err &&
                (err as { code?: string }).code === 'BALANCE_REMAINING'
              ) {
                const reason = window.prompt(
                  'Ainda há saldo. Informe motivo para forçar resolução:',
                )
                if (!reason?.trim()) {
                  setError(mapped)
                  return
                }
                resolveMutation.mutate({ force: true, reason: reason.trim() })
                return
              }
              setError(mapped)
            },
          },
        )
      }}
      onOpenReceivable={(path) => navigate(path)}
      onOpenRenegotiate={(receivableId) =>
        navigate(`${cobrancasConfig.contasReceberPath}?id=${receivableId}`)
      }
      onExport={() =>
        setError(
          'Exportação financeira usará o mecanismo central (em breve). Por enquanto, use filtros e a listagem.',
        )
      }
      onRefresh={() => void invalidate()}
    />
  )
}
