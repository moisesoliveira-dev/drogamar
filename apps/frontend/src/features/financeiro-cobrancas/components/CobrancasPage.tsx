import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Dialog } from '../../../shared/ui/Dialog'
import { MetricCard } from '../../../shared/ui/MetricCard'
import { Pagination } from '../../../shared/ui/Pagination'
import { SelectField } from '../../../shared/ui/SelectField'
import { Table, type TableColumn } from '../../../shared/ui/Table'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import {
  DAYS_BUCKET_OPTIONS,
  PAGE_DESCRIPTION,
  PERIOD_OPTIONS,
  badgeVariantForPriority,
  badgeVariantForStatus,
  formatDateBR,
  formatMoney,
  priorityLabel,
  type AgendaResult,
  type AgingResult,
  type CaseDetail,
  type CaseListItem,
  type CobrancasDashboard,
  type CobrancasLookups,
} from '../domain/cobrancas.schema'
import styles from './CobrancasPage.module.css'

export type CobrancasPageProps = {
  items: CaseListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  dashboard: CobrancasDashboard | null
  aging: AgingResult | null
  agenda: AgendaResult | null
  lookups: CobrancasLookups | null
  detail: CaseDetail | null
  detailLoading: boolean
  loading: boolean
  busy: boolean
  error: string | null
  searchDraft: string
  filters: {
    status: string
    financialStatus: string
    daysBucket: string
    assigneeId: string
    period: string
  }
  createOpen: boolean
  contactOpen: boolean
  promiseOpen: boolean
  nextActionOpen: boolean
  createForm: Record<string, string>
  contactForm: Record<string, string>
  promiseForm: Record<string, string>
  nextActionForm: Record<string, string>
  permissions: {
    canCreate: boolean
    canContact: boolean
    canPromise: boolean
    canAssign: boolean
    canResolve: boolean
    canCancel: boolean
    canExport: boolean
  }
  onSearchChange: (value: string) => void
  onFilterChange: (key: string, value: string | number) => void
  onClearFilters: () => void
  onSelect: (id: string) => void
  onCloseDetail: () => void
  onPageChange: (page: number) => void
  onOpenCreate: () => void
  onCloseCreate: () => void
  onCreateFormChange: (key: string, value: string) => void
  onSubmitCreate: () => void
  onOpenContact: () => void
  onCloseContact: () => void
  onContactFormChange: (key: string, value: string) => void
  onSubmitContact: () => void
  onOpenPromise: () => void
  onClosePromise: () => void
  onPromiseFormChange: (key: string, value: string) => void
  onSubmitPromise: () => void
  onOpenNextAction: () => void
  onCloseNextAction: () => void
  onNextActionFormChange: (key: string, value: string) => void
  onSubmitNextAction: () => void
  onAssign: (assigneeId: string) => void
  onCancelPromise: (promiseId: string) => void
  onCancelCase: () => void
  onResolveCase: () => void
  onOpenReceivable: (path: string) => void
  onOpenRenegotiate: (receivableId: string) => void
  onExport: () => void
  onRefresh: () => void
}

export function CobrancasPage(props: CobrancasPageProps) {
  const {
    items,
    total,
    page,
    pageSize,
    totalPages,
    dashboard,
    aging,
    agenda,
    lookups,
    detail,
    detailLoading,
    loading,
    busy,
    error,
    searchDraft,
    filters,
    createOpen,
    contactOpen,
    promiseOpen,
    nextActionOpen,
    createForm,
    contactForm,
    promiseForm,
    nextActionForm,
    permissions,
    onSearchChange,
    onFilterChange,
    onClearFilters,
    onSelect,
    onCloseDetail,
    onPageChange,
    onOpenCreate,
    onCloseCreate,
    onCreateFormChange,
    onSubmitCreate,
    onOpenContact,
    onCloseContact,
    onContactFormChange,
    onSubmitContact,
    onOpenPromise,
    onClosePromise,
    onPromiseFormChange,
    onSubmitPromise,
    onOpenNextAction,
    onCloseNextAction,
    onNextActionFormChange,
    onSubmitNextAction,
    onAssign,
    onCancelPromise,
    onCancelCase,
    onResolveCase,
    onOpenReceivable,
    onOpenRenegotiate,
    onExport,
    onRefresh,
  } = props

  const columns: TableColumn<CaseListItem>[] = [
    {
      id: 'number',
      header: 'Caso',
      cell: (row) => (
        <div className={styles.stack}>
          <strong>{row.number}</strong>
          <span className={styles.muted}>{row.customer.name}</span>
        </div>
      ),
    },
    {
      id: 'overdue',
      header: 'Em atraso',
      align: 'right',
      cell: (row) => (
        <div className={styles.stack}>
          <strong>{formatMoney(row.overdueAmount)}</strong>
          <span className={styles.muted}>
            {row.overdueAccountsCount} título(s) · {row.maxDaysOverdue}d
          </span>
        </div>
      ),
    },
    {
      id: 'priority',
      header: 'Prioridade',
      cell: (row) => (
        <Badge variant={badgeVariantForPriority(row.priorityScore)}>
          {priorityLabel(row.priorityScore)} ({row.priorityScore})
        </Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={badgeVariantForStatus(row.status)}>
          {row.statusLabel}
        </Badge>
      ),
    },
    {
      id: 'next',
      header: 'Próxima ação',
      cell: (row) => (
        <div className={styles.stack}>
          <span>{row.nextActionLabel || '—'}</span>
          <span className={styles.muted}>
            {formatDateBR(row.nextActionAt)}
          </span>
        </div>
      ),
    },
    {
      id: 'assignee',
      header: 'Responsável',
      cell: (row) => row.assignee?.name || '—',
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        title="Cobranças"
        description={PAGE_DESCRIPTION}
        breadcrumbs={[
          { label: 'Financeiro', path: '/app/financeiro/cobrancas' },
          { label: 'Cobranças' },
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={onExport} disabled={!permissions.canExport}>
              Exportar
            </Button>
            <Button variant="secondary" onClick={onRefresh}>
              Atualizar
            </Button>
            <Button onClick={onOpenCreate} disabled={!permissions.canCreate || busy}>
              Nova cobrança
            </Button>
          </>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {lookups && lookups.messagingConfigured === false ? (
        <Alert variant="warn">
          {lookups.messagingMessage || 'Canal não configurado'} — contatos
          WhatsApp/e-mail são apenas registrados, sem envio automático.
        </Alert>
      ) : null}

      <div className={styles.metrics}>
        <MetricCard
          label="Total em atraso"
          value={formatMoney(dashboard?.totalOverdue)}
        />
        <MetricCard
          label="Clientes inadimplentes"
          value={String(dashboard?.delinquentCustomers ?? '—')}
        />
        <MetricCard
          label="Cobranças ativas"
          value={String(dashboard?.pendingCollections ?? '—')}
        />
        <MetricCard
          label="Promessas ativas"
          value={String(dashboard?.activePromises ?? '—')}
        />
        <MetricCard
          label="Recuperado no período"
          value={formatMoney(dashboard?.recoveredViaCollections)}
        />
      </div>

      <p className={styles.sectionTitle}>Aging</p>
      <div className={styles.aging}>
        {(aging?.buckets ?? []).map((b) => (
          <div key={b.id} className={styles.agingItem}>
            <span>{b.label}</span>
            <strong>{formatMoney(b.amount)}</strong>
          </div>
        ))}
      </div>

      <p className={styles.sectionTitle}>Agenda</p>
      <div className={styles.agenda}>
        {(agenda?.items ?? []).length === 0 ? (
          <span className={styles.muted}>Nenhuma ação agendada no período.</span>
        ) : (
          agenda!.items.slice(0, 8).map((item) => (
            <button
              key={item.id}
              type="button"
              className={styles.agendaItem}
              onClick={() => onSelect(item.id)}
            >
              <div className={styles.stack}>
                <strong>
                  {item.number} · {item.customer.name}
                </strong>
                <span className={styles.muted}>
                  {item.nextActionLabel || 'Ação'} ·{' '}
                  {formatDateBR(item.nextActionAt)}
                </span>
              </div>
              <Badge variant={badgeVariantForStatus(item.status)}>
                {item.statusLabel}
              </Badge>
            </button>
          ))
        )}
      </div>

      <div className={styles.filters}>
        <TextField
          label="Buscar"
          value={searchDraft}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Cliente, documento, nº…"
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            ...(lookups?.statuses ?? []).map((s) => ({
              value: s.value,
              label: s.label,
            })),
          ]}
        />
        <SelectField
          label="Situação financeira"
          value={filters.financialStatus}
          onChange={(e) => onFilterChange('financialStatus', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'OVERDUE', label: 'Em atraso' },
            { value: 'OPEN', label: 'Em aberto' },
            { value: 'SETTLED', label: 'Liquidado' },
          ]}
        />
        <SelectField
          label="Faixa de atraso"
          value={filters.daysBucket}
          onChange={(e) => onFilterChange('daysBucket', e.target.value)}
          options={[...DAYS_BUCKET_OPTIONS]}
        />
        <SelectField
          label="Responsável"
          value={filters.assigneeId}
          onChange={(e) => onFilterChange('assigneeId', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            ...(lookups?.assignees ?? []).map((a) => ({
              value: a.id,
              label: a.name,
            })),
          ]}
        />
        <SelectField
          label="Período"
          value={filters.period}
          onChange={(e) => onFilterChange('period', e.target.value)}
          options={[...PERIOD_OPTIONS]}
        />
        <div className={styles.filterActions}>
          <Button variant="secondary" onClick={onClearFilters}>
            Limpar
          </Button>
        </div>
      </div>

      <div
        className={
          detail || detailLoading ? styles.layoutWithDetail : styles.layout
        }
      >
        <div className={styles.main}>
          {loading ? (
            <div className={styles.empty}>Carregando cobranças…</div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              Nenhum caso encontrado. Crie uma cobrança a partir de um cliente
              ou título em atraso.
            </div>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <Table
                  columns={columns}
                  rows={items}
                  rowKey={(row) => row.id}
                  selectedKey={detail?.id}
                  onRowClick={(row) => onSelect(row.id)}
                />
              </div>
              <div className={styles.cards}>
                {items.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    className={styles.caseCard}
                    onClick={() => onSelect(row.id)}
                  >
                    <strong>
                      {row.number} · {row.customer.name}
                    </strong>
                    <span>{formatMoney(row.overdueAmount)}</span>
                    <Badge variant={badgeVariantForPriority(row.priorityScore)}>
                      {priorityLabel(row.priorityScore)}
                    </Badge>
                  </button>
                ))}
              </div>
              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                totalPages={totalPages}
                onPageChange={onPageChange}
              />
            </>
          )}
        </div>

        {(detail || detailLoading) && (
          <aside className={styles.drawer}>
            {detailLoading || !detail ? (
              <span className={styles.muted}>Carregando detalhe…</span>
            ) : (
              <>
                <div className={styles.drawerHeader}>
                  <div className={styles.stack}>
                    <h2>
                      {detail.number} · {detail.customer.name}
                    </h2>
                    <span className={styles.muted}>
                      {detail.customer.document || detail.customer.code}
                      {detail.customer.phone
                        ? ` · ${detail.customer.phone}`
                        : ''}
                    </span>
                  </div>
                  <Button variant="secondary" onClick={onCloseDetail}>
                    Fechar
                  </Button>
                </div>

                <div className={styles.actions}>
                  <Badge variant={badgeVariantForStatus(detail.status)}>
                    {detail.statusLabel}
                  </Badge>
                  <Badge
                    variant={badgeVariantForPriority(detail.priorityScore)}
                  >
                    Prioridade {priorityLabel(detail.priorityScore)}
                  </Badge>
                </div>

                <div className={styles.block}>
                  <h3>Resumo financeiro</h3>
                  <div className={styles.listRow}>
                    <span>
                      Em atraso: <strong>{formatMoney(detail.overdueAmount)}</strong>
                    </span>
                    <span className={styles.muted}>
                      {detail.overdueAccountsCount} título(s) · máx.{' '}
                      {detail.maxDaysOverdue} dias
                    </span>
                  </div>
                </div>

                <div className={styles.block}>
                  <h3>Títulos vinculados</h3>
                  {detail.receivables.length === 0 ? (
                    <span className={styles.muted}>Nenhum título.</span>
                  ) : (
                    detail.receivables.map((r) => (
                      <div key={r.id} className={styles.listRow}>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => onOpenReceivable(r.contasReceberPath)}
                        >
                          {r.number} · {r.description}
                        </button>
                        <span>
                          {formatMoney(r.balance)} · venc.{' '}
                          {formatDateBR(r.dueDate)} · {r.displayStatus}
                        </span>
                        <button
                          type="button"
                          className={styles.linkBtn}
                          onClick={() => onOpenRenegotiate(r.id)}
                        >
                          Renegociar em Contas a Receber
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.actions}>
                  {permissions.canContact ? (
                    <Button variant="secondary" onClick={onOpenContact} disabled={busy}>
                      Registrar contato
                    </Button>
                  ) : null}
                  {permissions.canPromise ? (
                    <Button variant="secondary" onClick={onOpenPromise} disabled={busy}>
                      Promessa
                    </Button>
                  ) : null}
                  <Button variant="secondary" onClick={onOpenNextAction} disabled={busy}>
                    Próxima ação
                  </Button>
                  {permissions.canResolve ? (
                    <Button variant="secondary" onClick={onResolveCase} disabled={busy}>
                      Resolver
                    </Button>
                  ) : null}
                  {permissions.canCancel ? (
                    <Button variant="secondary" onClick={onCancelCase} disabled={busy}>
                      Cancelar
                    </Button>
                  ) : null}
                </div>

                {permissions.canAssign && lookups ? (
                  <SelectField
                    label="Responsável"
                    value={detail.assignee?.id || ''}
                    onChange={(e) => onAssign(e.target.value || '')}
                    options={[
                      { value: '', label: 'Sem responsável' },
                      ...lookups.assignees.map((a) => ({
                        value: a.id,
                        label: a.name,
                      })),
                    ]}
                  />
                ) : null}

                <div className={styles.block}>
                  <h3>Contatos</h3>
                  {detail.contacts.length === 0 ? (
                    <span className={styles.muted}>Sem contatos.</span>
                  ) : (
                    detail.contacts.map((c) => (
                      <div key={c.id} className={styles.listRow}>
                        <strong>
                          {c.channelLabel} · {c.outcomeLabel}
                        </strong>
                        <span className={styles.muted}>
                          {formatDateBR(c.contactedAt)} · {c.actor.name}
                        </span>
                        {c.notes ? <span>{c.notes}</span> : null}
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.block}>
                  <h3>Promessas</h3>
                  {detail.promises.length === 0 ? (
                    <span className={styles.muted}>Sem promessas.</span>
                  ) : (
                    detail.promises.map((p) => (
                      <div key={p.id} className={styles.listRow}>
                        <strong>
                          {formatMoney(p.promisedAmount)} até{' '}
                          {formatDateBR(p.promisedDate)} · {p.status}
                        </strong>
                        {(p.status === 'PENDING' || p.status === 'OVERDUE') &&
                        permissions.canPromise ? (
                          <Button
                            variant="secondary"
                            onClick={() => onCancelPromise(p.id)}
                            disabled={busy}
                          >
                            Cancelar promessa
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>

                <div className={styles.block}>
                  <h3>Histórico</h3>
                  {detail.history.length === 0 ? (
                    <span className={styles.muted}>Sem eventos.</span>
                  ) : (
                    detail.history.map((h) => (
                      <div key={h.id} className={styles.listRow}>
                        <strong>{h.action}</strong>
                        <span className={styles.muted}>
                          {formatDateBR(h.createdAt)} · {h.actor.name}
                        </span>
                        {h.message ? <span>{h.message}</span> : null}
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </aside>
        )}
      </div>

      <Dialog
        open={createOpen}
        title="Nova cobrança"
        onClose={onCloseCreate}
        footer={
          <>
            <Button variant="secondary" onClick={onCloseCreate}>
              Cancelar
            </Button>
            <Button onClick={onSubmitCreate} disabled={busy}>
              Criar
            </Button>
          </>
        }
      >
        <TextField
          label="ID do cliente"
          value={createForm.customerId}
          onChange={(e) => onCreateFormChange('customerId', e.target.value)}
          placeholder="Ou informe receivableIds abaixo"
        />
        <TextField
          label="IDs de contas a receber (vírgula)"
          value={createForm.receivableIds}
          onChange={(e) => onCreateFormChange('receivableIds', e.target.value)}
        />
        <TextField
          label="Observações"
          value={createForm.notes}
          onChange={(e) => onCreateFormChange('notes', e.target.value)}
        />
      </Dialog>

      <Dialog
        open={contactOpen}
        title="Registrar contato"
        onClose={onCloseContact}
        footer={
          <>
            <Button variant="secondary" onClick={onCloseContact}>
              Cancelar
            </Button>
            <Button onClick={onSubmitContact} disabled={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <SelectField
          label="Canal"
          value={contactForm.channel}
          onChange={(e) => onContactFormChange('channel', e.target.value)}
          options={(lookups?.channels ?? []).map((c) => ({
            value: c.value,
            label: c.label,
          }))}
        />
        <SelectField
          label="Resultado"
          value={contactForm.outcome}
          onChange={(e) => onContactFormChange('outcome', e.target.value)}
          options={(lookups?.outcomes ?? []).map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <TextField
          label="Notas"
          value={contactForm.notes}
          onChange={(e) => onContactFormChange('notes', e.target.value)}
        />
      </Dialog>

      <Dialog
        open={promiseOpen}
        title="Nova promessa de pagamento"
        onClose={onClosePromise}
        footer={
          <>
            <Button variant="secondary" onClick={onClosePromise}>
              Cancelar
            </Button>
            <Button onClick={onSubmitPromise} disabled={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <TextField
          label="Valor"
          value={promiseForm.promisedAmount}
          onChange={(e) => onPromiseFormChange('promisedAmount', e.target.value)}
        />
        <TextField
          label="Data prometida"
          type="date"
          value={promiseForm.promisedDate}
          onChange={(e) => onPromiseFormChange('promisedDate', e.target.value)}
        />
        <TextField
          label="Notas"
          value={promiseForm.notes}
          onChange={(e) => onPromiseFormChange('notes', e.target.value)}
        />
      </Dialog>

      <Dialog
        open={nextActionOpen}
        title="Próxima ação"
        onClose={onCloseNextAction}
        footer={
          <>
            <Button variant="secondary" onClick={onCloseNextAction}>
              Cancelar
            </Button>
            <Button onClick={onSubmitNextAction} disabled={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <SelectField
          label="Ação"
          value={nextActionForm.nextAction}
          onChange={(e) => onNextActionFormChange('nextAction', e.target.value)}
          options={(lookups?.nextActions ?? []).map((a) => ({
            value: a.value,
            label: a.label,
          }))}
        />
        <TextField
          label="Quando"
          type="datetime-local"
          value={nextActionForm.nextActionAt}
          onChange={(e) =>
            onNextActionFormChange('nextActionAt', e.target.value)
          }
        />
        <TextField
          label="Notas"
          value={nextActionForm.notes}
          onChange={(e) => onNextActionFormChange('notes', e.target.value)}
        />
      </Dialog>
    </div>
  )
}
