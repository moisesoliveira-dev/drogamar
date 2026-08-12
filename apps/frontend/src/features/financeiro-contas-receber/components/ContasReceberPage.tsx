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
  badgeVariantForReceivableStatus,
  DISPLAY_STATUS_LABELS,
  formatDateBR,
  formatMoney,
  type ReceivableDashboard,
  type ReceivableDetail,
  type ReceivableListItem,
  type ReceivableLookups,
} from '../domain/contas-receber.schema'
import styles from './ContasReceberPage.module.css'

export type ContasReceberPageProps = {
  items: ReceivableListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  dashboard: ReceivableDashboard | null
  lookups: ReceivableLookups | null
  detail: ReceivableDetail | null
  detailLoading: boolean
  loading: boolean
  busy: boolean
  error: string | null
  searchDraft: string
  filters: {
    status: string
    period: string
    paymentMethodId: string
    bankAccountId: string
    costCenterId: string
    origin: string
  }
  createOpen: boolean
  receiveOpen: boolean
  renegotiateOpen: boolean
  createForm: Record<string, string>
  receiveForm: Record<string, string>
  renegotiateForm: Record<string, string>
  customers: Array<{
    id: string
    code: string
    name: string
    document?: string | null
  }>
  customerSearch: string
  permissions: {
    canCreate: boolean
    canReceive: boolean
    canReverse: boolean
    canDiscount: boolean
    canRenegotiate: boolean
    canCancel: boolean
    canExport: boolean
    canSendCollection: boolean
  }
  onSearchChange: (value: string) => void
  onFilterChange: (key: string, value: string | number) => void
  onClearFilters: () => void
  onPageChange: (page: number) => void
  onSelect: (id: string) => void
  onCloseDetail: () => void
  onOpenCreate: () => void
  onCloseCreate: () => void
  onCreateFormChange: (key: string, value: string) => void
  onCustomerSearchChange: (value: string) => void
  onSubmitCreate: () => void
  onOpenReceive: () => void
  onCloseReceive: () => void
  onReceiveFormChange: (key: string, value: string) => void
  onSubmitReceive: () => void
  onReverse: (movementId: string) => void
  onOpenRenegotiate: () => void
  onCloseRenegotiate: () => void
  onRenegotiateFormChange: (key: string, value: string) => void
  onSubmitRenegotiate: () => void
  onCancel: () => void
  onExport: () => void
  onSendCollection: () => void
  onRefresh: () => void
}

export function ContasReceberPage(props: ContasReceberPageProps) {
  const {
    items,
    total,
    page,
    pageSize,
    totalPages,
    dashboard,
    lookups,
    detail,
    detailLoading,
    loading,
    busy,
    error,
    searchDraft,
    filters,
    createOpen,
    receiveOpen,
    renegotiateOpen,
    createForm,
    receiveForm,
    renegotiateForm,
    customers,
    customerSearch,
    permissions,
    onSearchChange,
    onFilterChange,
    onClearFilters,
    onPageChange,
    onSelect,
    onCloseDetail,
    onOpenCreate,
    onCloseCreate,
    onCreateFormChange,
    onCustomerSearchChange,
    onSubmitCreate,
    onOpenReceive,
    onCloseReceive,
    onReceiveFormChange,
    onSubmitReceive,
    onReverse,
    onOpenRenegotiate,
    onCloseRenegotiate,
    onRenegotiateFormChange,
    onSubmitRenegotiate,
    onCancel,
    onExport,
    onSendCollection,
    onRefresh,
  } = props

  const columns: TableColumn<ReceivableListItem>[] = [
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={badgeVariantForReceivableStatus(row.displayStatus)}>
          {DISPLAY_STATUS_LABELS[row.displayStatus] ?? row.displayStatus}
        </Badge>
      ),
    },
    {
      id: 'customer',
      header: 'Cliente',
      cell: (row) => (
        <div className={styles.stack}>
          <strong>{row.customer.name}</strong>
          <span className={styles.muted}>{row.customer.code}</span>
        </div>
      ),
    },
    {
      id: 'document',
      header: 'Documento',
      cell: (row) => row.document ?? '—',
    },
    {
      id: 'origin',
      header: 'Origem',
      cell: (row) =>
        row.originRef ? `${row.origin} · ${row.originRef}` : row.origin,
    },
    {
      id: 'installment',
      header: 'Parcela',
      cell: (row) => row.installmentLabel,
    },
    {
      id: 'dueDate',
      header: 'Vencimento',
      cell: (row) => (
        <div className={styles.stack}>
          <span>{formatDateBR(row.dueDate)}</span>
          {row.overdueDays > 0 ? (
            <span className={styles.dangerText}>
              {row.overdueDays} dias em atraso
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: 'originalAmount',
      header: 'Valor original',
      align: 'right',
      cell: (row) => formatMoney(row.originalAmount),
    },
    {
      id: 'discountAmount',
      header: 'Desconto',
      align: 'right',
      cell: (row) => formatMoney(row.discountAmount),
    },
    {
      id: 'interestAmount',
      header: 'Juros',
      align: 'right',
      cell: (row) => formatMoney(row.interestAmount),
    },
    {
      id: 'fineAmount',
      header: 'Multa',
      align: 'right',
      cell: (row) => formatMoney(row.fineAmount),
    },
    {
      id: 'updatedAmount',
      header: 'Valor atualizado',
      align: 'right',
      cell: (row) => formatMoney(row.updatedAmount),
    },
    {
      id: 'paidAmount',
      header: 'Recebido',
      align: 'right',
      cell: (row) => formatMoney(row.paidAmount),
    },
    {
      id: 'balance',
      header: 'Saldo',
      align: 'right',
      cell: (row) => <strong>{formatMoney(row.balance)}</strong>,
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) => (
        <Button variant="ghost" onClick={() => onSelect(row.id)}>
          Detalhes
        </Button>
      ),
    },
  ]

  const canReceiveDetail =
    permissions.canReceive &&
    detail &&
    (detail.status === 'OPEN' || detail.status === 'PARTIAL') &&
    detail.balance > 0

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumbs={[
          { label: 'Financeiro', path: '/app/financeiro/contas-receber' },
          { label: 'F1 — Contas a Receber' },
        ]}
        title="Contas a Receber"
        description="Gerencie valores, parcelas e recebimentos dos seus clientes."
        actions={
          <>
            {permissions.canExport ? (
              <Button variant="secondary" onClick={onExport} disabled={busy}>
                Exportar
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onRefresh} disabled={busy}>
              Atualizar
            </Button>
            {permissions.canCreate ? (
              <Button onClick={onOpenCreate} disabled={busy}>
                + Nova conta
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section className={styles.metrics} aria-label="Resumo">
        <MetricCard
          label="Total a receber"
          value={formatMoney(dashboard?.totalOpen ?? 0)}
        />
        <MetricCard
          label="Vencendo hoje"
          value={formatMoney(dashboard?.dueToday ?? 0)}
          tone="warn"
        />
        <MetricCard
          label="Em atraso"
          value={formatMoney(dashboard?.overdue ?? 0)}
          tone="danger"
        />
        <MetricCard
          label="Recebido no período"
          value={formatMoney(dashboard?.receivedInPeriod ?? 0)}
          tone="success"
        />
        <MetricCard
          label="A receber no período"
          value={formatMoney(dashboard?.expectedInPeriod ?? 0)}
          tone="info"
        />
      </section>

      <section className={styles.filters} aria-label="Filtros">
        <TextField
          label="Buscar"
          value={searchDraft}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por cliente, documento ou número da conta..."
        />
        <SelectField
          label="Período"
          value={filters.period}
          onChange={(e) => onFilterChange('period', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'TODAY', label: 'Hoje' },
            { value: 'WEEK', label: 'Esta semana' },
            { value: 'MONTH', label: 'Este mês' },
            { value: 'NEXT_MONTH', label: 'Próximo mês' },
          ]}
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'OPEN', label: 'Em aberto' },
            { value: 'DUE_TODAY', label: 'Vencendo hoje' },
            { value: 'OVERDUE', label: 'Vencida' },
            { value: 'PARTIAL', label: 'Parcialmente recebida' },
            { value: 'SETTLED', label: 'Recebida' },
            { value: 'CANCELLED', label: 'Cancelada' },
            { value: 'RENEGOTIATED', label: 'Renegociada' },
          ]}
        />
        <SelectField
          label="Forma de pagamento"
          value={filters.paymentMethodId || 'ALL'}
          onChange={(e) =>
            onFilterChange(
              'paymentMethodId',
              e.target.value === 'ALL' ? '' : e.target.value,
            )
          }
          options={[
            { value: 'ALL', label: 'Todas' },
            ...(lookups?.paymentMethods.map((m) => ({
              value: m.id,
              label: m.label,
            })) ?? []),
          ]}
        />
        <SelectField
          label="Conta/caixa"
          value={filters.bankAccountId || 'ALL'}
          onChange={(e) =>
            onFilterChange(
              'bankAccountId',
              e.target.value === 'ALL' ? '' : e.target.value,
            )
          }
          options={[
            { value: 'ALL', label: 'Todas' },
            ...(lookups?.bankAccounts.map((a) => ({
              value: a.id,
              label: a.name,
            })) ?? []),
          ]}
        />
        <SelectField
          label="Centro de custo"
          value={filters.costCenterId || 'ALL'}
          onChange={(e) =>
            onFilterChange(
              'costCenterId',
              e.target.value === 'ALL' ? '' : e.target.value,
            )
          }
          options={[
            { value: 'ALL', label: 'Todos' },
            ...(lookups?.costCenters.map((c) => ({
              value: c.id,
              label: c.name,
            })) ?? []),
          ]}
        />
        <SelectField
          label="Origem"
          value={filters.origin}
          onChange={(e) => onFilterChange('origin', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'SALE', label: 'Venda' },
            { value: 'MANUAL', label: 'Lançamento manual' },
            { value: 'CONTRACT', label: 'Contrato' },
            { value: 'OTHER', label: 'Outros' },
          ]}
        />
        <div className={styles.filterActions}>
          <Button variant="secondary" onClick={onClearFilters}>
            Limpar
          </Button>
        </div>
      </section>

      <div
        className={detail ? styles.layoutWithDetail : styles.layout}
      >
        <section className={styles.main}>
          <div className={styles.desktopTable}>
            <Table
              columns={columns}
              rows={items}
              rowKey={(row) => row.id}
              loading={loading}
              emptyTitle="Nenhuma conta a receber encontrada"
              emptyDescription="As contas geradas por vendas ou lançamentos financeiros aparecerão aqui."
              onRowClick={(row) => onSelect(row.id)}
              selectedKey={detail?.id ?? null}
            />
          </div>
          <div className={styles.mobileList}>
            {loading ? (
              <p className={styles.muted}>Carregando…</p>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>Nenhuma conta a receber encontrada</h2>
                <p>
                  As contas geradas por vendas ou lançamentos financeiros
                  aparecerão aqui.
                </p>
                {permissions.canCreate ? (
                  <Button onClick={onOpenCreate}>+ Nova conta</Button>
                ) : null}
              </div>
            ) : (
              items.map((row) => (
                <article
                  key={row.id}
                  className={styles.mobileCard}
                  onClick={() => onSelect(row.id)}
                >
                  <header>
                    <strong>{row.customer.name}</strong>
                    <Badge
                      variant={badgeVariantForReceivableStatus(row.displayStatus)}
                    >
                      {DISPLAY_STATUS_LABELS[row.displayStatus]}
                    </Badge>
                  </header>
                  <p className={styles.muted}>
                    Venc. {formatDateBR(row.dueDate)} · {row.number}
                  </p>
                  <p>
                    Saldo <strong>{formatMoney(row.balance)}</strong>
                  </p>
                </article>
              ))
            )}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        </section>

        {detail ? (
          <aside className={styles.detail} aria-label="Detalhes da conta">
            <div className={styles.detailHeader}>
              <div>
                <h2>{detail.number}</h2>
                <Badge
                  variant={badgeVariantForReceivableStatus(detail.displayStatus)}
                >
                  {DISPLAY_STATUS_LABELS[detail.displayStatus]}
                </Badge>
              </div>
              <Button variant="ghost" onClick={onCloseDetail}>
                Fechar
              </Button>
            </div>
            {detailLoading ? <p className={styles.muted}>Atualizando…</p> : null}
            {detail.overdueDays > 0 ? (
              <Alert variant="warn">
                {detail.overdueDays} dias em atraso · Vencimento{' '}
                {formatDateBR(detail.dueDate)}
              </Alert>
            ) : null}

            <h3>Cliente</h3>
            <dl className={styles.facts}>
              <div>
                <dt>Nome</dt>
                <dd>{detail.customer.name}</dd>
              </div>
              <div>
                <dt>Documento</dt>
                <dd>{detail.customer.document ?? '—'}</dd>
              </div>
              <div>
                <dt>Contato</dt>
                <dd>{detail.customer.phone ?? '—'}</dd>
              </div>
            </dl>

            <h3>Valores</h3>
            <dl className={styles.facts}>
              <div>
                <dt>Valor original</dt>
                <dd>{formatMoney(detail.originalAmount)}</dd>
              </div>
              <div>
                <dt>Descontos</dt>
                <dd>{formatMoney(detail.discountAmount)}</dd>
              </div>
              <div>
                <dt>Juros</dt>
                <dd>{formatMoney(detail.interestAmount)}</dd>
              </div>
              <div>
                <dt>Multa</dt>
                <dd>{formatMoney(detail.fineAmount)}</dd>
              </div>
              <div>
                <dt>Valor atualizado</dt>
                <dd>{formatMoney(detail.updatedAmount)}</dd>
              </div>
              <div>
                <dt>Recebido</dt>
                <dd>{formatMoney(detail.paidAmount)}</dd>
              </div>
              <div>
                <dt>Saldo</dt>
                <dd>
                  <strong>{formatMoney(detail.balance)}</strong>
                </dd>
              </div>
            </dl>

            <h3>Parcelas</h3>
            <ul className={styles.simpleList}>
              {detail.installments.map((inst) => (
                <li key={inst.id}>
                  <span>
                    {inst.label} · {formatDateBR(inst.dueDate)}
                  </span>
                  <span>
                    {formatMoney(inst.balance)} ·{' '}
                    {DISPLAY_STATUS_LABELS[inst.displayStatus] ?? inst.status}
                  </span>
                </li>
              ))}
            </ul>

            <div className={styles.detailActions}>
              {canReceiveDetail ? (
                <Button onClick={onOpenReceive} disabled={busy}>
                  Registrar recebimento
                </Button>
              ) : null}
              {permissions.canRenegotiate &&
              (detail.status === 'OPEN' || detail.status === 'PARTIAL') ? (
                <Button
                  variant="secondary"
                  onClick={onOpenRenegotiate}
                  disabled={busy}
                >
                  Renegociar
                </Button>
              ) : null}
              {permissions.canSendCollection && detail.displayStatus === 'OVERDUE' ? (
                <Button
                  variant="secondary"
                  onClick={onSendCollection}
                  disabled={busy}
                >
                  Enviar cobrança
                </Button>
              ) : null}
              {permissions.canCancel &&
              detail.status !== 'SETTLED' &&
              detail.status !== 'CANCELLED' ? (
                <Button variant="ghost" onClick={onCancel} disabled={busy}>
                  Cancelar conta
                </Button>
              ) : null}
            </div>

            <h3>Recebimentos</h3>
            <ul className={styles.simpleList}>
              {detail.movements.length === 0 ? (
                <li className={styles.muted}>Nenhum recebimento.</li>
              ) : (
                detail.movements.map((m) => (
                  <li key={m.id}>
                    <div className={styles.stack}>
                      <strong>
                        {m.type === 'REVERSAL' ? 'Estorno' : 'Recebimento'}{' '}
                        {formatMoney(m.amount)}
                      </strong>
                      <span className={styles.muted}>
                        {formatDateBR(m.paidAt)} · {m.operatorName}
                        {m.paymentMethodLabel ? ` · ${m.paymentMethodLabel}` : ''}
                      </span>
                    </div>
                    {permissions.canReverse &&
                    m.type === 'RECEIPT' &&
                    !detail.movements.some(
                      (x) => x.reversesMovementId === m.id,
                    ) ? (
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() => onReverse(m.id)}
                      >
                        Estornar
                      </Button>
                    ) : null}
                  </li>
                ))
              )}
            </ul>

            <h3>Histórico</h3>
            <ul className={styles.simpleList}>
              {detail.history.map((h) => (
                <li key={h.id}>
                  <div className={styles.stack}>
                    <strong>{h.action}</strong>
                    <span className={styles.muted}>
                      {h.actorName} ·{' '}
                      {new Date(h.createdAt).toLocaleString('pt-BR')}
                      {h.amount != null ? ` · ${formatMoney(h.amount)}` : ''}
                    </span>
                    {h.message ? (
                      <span className={styles.muted}>{h.message}</span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </div>

      <Dialog open={createOpen} onClose={onCloseCreate} title="Nova conta">
        <div className={styles.dialogBody}>
          <TextField
            label="Buscar cliente"
            value={customerSearch}
            onChange={(e) => onCustomerSearchChange(e.target.value)}
          />
          <SelectField
            label="Cliente"
            value={createForm.customerId}
            onChange={(e) => onCreateFormChange('customerId', e.target.value)}
            options={[
              { value: '', label: 'Selecione' },
              ...customers.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.code})`,
              })),
            ]}
          />
          <TextField
            label="Descrição"
            value={createForm.description}
            onChange={(e) => onCreateFormChange('description', e.target.value)}
          />
          <TextField
            label="Documento"
            value={createForm.document}
            onChange={(e) => onCreateFormChange('document', e.target.value)}
          />
          <TextField
            label="Valor"
            value={createForm.originalAmount}
            onChange={(e) =>
              onCreateFormChange('originalAmount', e.target.value)
            }
          />
          <TextField
            label="Emissão"
            type="date"
            value={createForm.issueDate}
            onChange={(e) => onCreateFormChange('issueDate', e.target.value)}
          />
          <TextField
            label="Vencimento"
            type="date"
            value={createForm.dueDate}
            onChange={(e) => onCreateFormChange('dueDate', e.target.value)}
          />
          <TextField
            label="Parcelas"
            value={createForm.installmentCount}
            onChange={(e) =>
              onCreateFormChange('installmentCount', e.target.value)
            }
          />
          <SelectField
            label="Forma de cobrança"
            value={createForm.paymentMethodId}
            onChange={(e) =>
              onCreateFormChange('paymentMethodId', e.target.value)
            }
            options={[
              { value: '', label: 'Opcional' },
              ...(lookups?.paymentMethods.map((m) => ({
                value: m.id,
                label: m.label,
              })) ?? []),
            ]}
          />
          <Button loading={busy} onClick={onSubmitCreate}>
            Salvar conta
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={receiveOpen}
        onClose={onCloseReceive}
        title="Registrar recebimento"
      >
        <div className={styles.dialogBody}>
          {detail ? (
            <p className={styles.muted}>
              Saldo atual: <strong>{formatMoney(detail.balance)}</strong>
            </p>
          ) : null}
          <TextField
            label="Valor recebido"
            value={receiveForm.amount}
            onChange={(e) => onReceiveFormChange('amount', e.target.value)}
          />
          <TextField
            label="Data do recebimento"
            type="date"
            value={receiveForm.paidAt}
            onChange={(e) => onReceiveFormChange('paidAt', e.target.value)}
          />
          <SelectField
            label="Forma de pagamento"
            value={receiveForm.paymentMethodId}
            onChange={(e) =>
              onReceiveFormChange('paymentMethodId', e.target.value)
            }
            options={[
              { value: '', label: 'Selecione' },
              ...(lookups?.paymentMethods.map((m) => ({
                value: m.id,
                label: m.label,
              })) ?? []),
            ]}
          />
          <SelectField
            label="Conta de destino"
            value={receiveForm.bankAccountId}
            onChange={(e) =>
              onReceiveFormChange('bankAccountId', e.target.value)
            }
            options={[
              { value: '', label: 'Selecione' },
              ...(lookups?.bankAccounts.map((a) => ({
                value: a.id,
                label: a.name,
              })) ?? []),
            ]}
          />
          {permissions.canDiscount ? (
            <TextField
              label="Desconto"
              value={receiveForm.discountAmount}
              onChange={(e) =>
                onReceiveFormChange('discountAmount', e.target.value)
              }
              hint={`Limite do operador: ${lookups?.operatorDiscountLimitPercent ?? 10}%`}
            />
          ) : null}
          <TextField
            label="Observação"
            value={receiveForm.notes}
            onChange={(e) => onReceiveFormChange('notes', e.target.value)}
          />
          <Button loading={busy} onClick={onSubmitReceive}>
            Confirmar recebimento
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={renegotiateOpen}
        onClose={onCloseRenegotiate}
        title="Renegociar débito"
      >
        <div className={styles.dialogBody}>
          <TextField
            label="Quantidade de parcelas"
            value={renegotiateForm.installmentCount}
            onChange={(e) =>
              onRenegotiateFormChange('installmentCount', e.target.value)
            }
          />
          <TextField
            label="Primeiro vencimento"
            type="date"
            value={renegotiateForm.firstDueDate}
            onChange={(e) =>
              onRenegotiateFormChange('firstDueDate', e.target.value)
            }
          />
          <TextField
            label="Juros"
            value={renegotiateForm.interestAmount}
            onChange={(e) =>
              onRenegotiateFormChange('interestAmount', e.target.value)
            }
          />
          <TextField
            label="Desconto"
            value={renegotiateForm.discountAmount}
            onChange={(e) =>
              onRenegotiateFormChange('discountAmount', e.target.value)
            }
          />
          <TextField
            label="Observação"
            value={renegotiateForm.notes}
            onChange={(e) => onRenegotiateFormChange('notes', e.target.value)}
          />
          <Button loading={busy} onClick={onSubmitRenegotiate}>
            Confirmar renegociação
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
