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
  APPROVAL_STATUS_LABELS,
  badgeVariantForPayableStatus,
  DISPLAY_STATUS_LABELS,
  formatDateBR,
  formatMoney,
  type PayableDashboard,
  type PayableDetail,
  type PayableListItem,
  type PayableLookups,
} from '../domain/contas-pagar.schema'
import styles from './ContasPagarPage.module.css'

export type ContasPagarPageProps = {
  items: PayableListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  dashboard: PayableDashboard | null
  lookups: PayableLookups | null
  detail: PayableDetail | null
  detailLoading: boolean
  loading: boolean
  busy: boolean
  error: string | null
  searchDraft: string
  filters: {
    status: string
    period: string
    supplierId: string
    categoryId: string
    paymentMethodId: string
    bankAccountId: string
    costCenterId: string
    origin: string
  }
  createOpen: boolean
  payOpen: boolean
  renegotiateOpen: boolean
  scheduleOpen: boolean
  createForm: Record<string, string>
  payForm: Record<string, string>
  renegotiateForm: Record<string, string>
  scheduleForm: Record<string, string>
  suppliers: Array<{
    id: string
    code: string
    name: string
    document?: string | null
  }>
  supplierSearch: string
  permissions: {
    canCreate: boolean
    canPay: boolean
    canReverse: boolean
    canDiscount: boolean
    canRenegotiate: boolean
    canCancel: boolean
    canExport: boolean
    canApprove: boolean
    canSchedule: boolean
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
  onSupplierSearchChange: (value: string) => void
  onSubmitCreate: () => void
  onOpenPay: () => void
  onClosePay: () => void
  onPayFormChange: (key: string, value: string) => void
  onSubmitPay: () => void
  onReverse: (movementId: string) => void
  onOpenRenegotiate: () => void
  onCloseRenegotiate: () => void
  onRenegotiateFormChange: (key: string, value: string) => void
  onSubmitRenegotiate: () => void
  onOpenSchedule: () => void
  onCloseSchedule: () => void
  onScheduleFormChange: (key: string, value: string) => void
  onSubmitSchedule: () => void
  onRequestApproval: () => void
  onApprove: () => void
  onReject: () => void
  onCancel: () => void
  onExport: () => void
  onRefresh: () => void
}

export function ContasPagarPage(props: ContasPagarPageProps) {
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
    payOpen,
    renegotiateOpen,
    scheduleOpen,
    createForm,
    payForm,
    renegotiateForm,
    scheduleForm,
    suppliers,
    supplierSearch,
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
    onSupplierSearchChange,
    onSubmitCreate,
    onOpenPay,
    onClosePay,
    onPayFormChange,
    onSubmitPay,
    onReverse,
    onOpenRenegotiate,
    onCloseRenegotiate,
    onRenegotiateFormChange,
    onSubmitRenegotiate,
    onOpenSchedule,
    onCloseSchedule,
    onScheduleFormChange,
    onSubmitSchedule,
    onRequestApproval,
    onApprove,
    onReject,
    onCancel,
    onExport,
    onRefresh,
  } = props

  const columns: TableColumn<PayableListItem>[] = [
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={badgeVariantForPayableStatus(row.displayStatus)}>
          {DISPLAY_STATUS_LABELS[row.displayStatus] ?? row.displayStatus}
        </Badge>
      ),
    },
    {
      id: 'supplier',
      header: 'Fornecedor',
      cell: (row) => (
        <div className={styles.stack}>
          <strong>{row.supplier.name}</strong>
          <span className={styles.muted}>{row.supplier.code}</span>
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
      id: 'category',
      header: 'Categoria',
      cell: (row) => row.category?.name ?? '—',
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
      header: 'Valor pago',
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

  const approvalBlocked =
    Boolean(detail?.requiresApproval) && detail?.approvalStatus !== 'APPROVED'

  const canPayDetail =
    permissions.canPay &&
    detail &&
    (detail.status === 'OPEN' || detail.status === 'PARTIAL') &&
    detail.balance > 0 &&
    !approvalBlocked

  const canRequestApproval =
    permissions.canApprove &&
    detail &&
    detail.requiresApproval &&
    (detail.approvalStatus === 'NONE' || detail.approvalStatus === 'REJECTED') &&
    detail.status !== 'SETTLED' &&
    detail.status !== 'CANCELLED' &&
    detail.status !== 'RENEGOTIATED'

  const canDecideApproval =
    permissions.canApprove &&
    detail &&
    detail.requiresApproval &&
    detail.approvalStatus === 'PENDING'

  const canScheduleDetail =
    permissions.canSchedule &&
    detail &&
    (detail.status === 'OPEN' || detail.status === 'PARTIAL') &&
    detail.balance > 0

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumbs={[
          { label: 'Financeiro', path: '/app/financeiro/contas-pagar' },
          { label: 'F2 — Contas a Pagar' },
        ]}
        title="Contas a Pagar"
        description="Gerencie as obrigações financeiras, pagamentos e vencimentos da empresa."
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
          label="Total a pagar"
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
          label="Pagamentos no período"
          value={formatMoney(dashboard?.paidInPeriod ?? 0)}
          tone="success"
        />
        <MetricCard
          label="A pagar no período"
          value={formatMoney(dashboard?.expectedInPeriod ?? 0)}
          tone="info"
        />
      </section>

      <section className={styles.filters} aria-label="Filtros">
        <TextField
          label="Buscar"
          value={searchDraft}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar fornecedor, documento ou número da conta..."
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
            { value: 'PARTIAL', label: 'Parcialmente paga' },
            { value: 'SETTLED', label: 'Paga' },
            { value: 'CANCELLED', label: 'Cancelada' },
            { value: 'RENEGOTIATED', label: 'Renegociada' },
          ]}
        />
        <SelectField
          label="Fornecedor"
          value={filters.supplierId || 'ALL'}
          onChange={(e) =>
            onFilterChange(
              'supplierId',
              e.target.value === 'ALL' ? '' : e.target.value,
            )
          }
          options={[
            { value: 'ALL', label: 'Todos' },
            ...suppliers.map((s) => ({
              value: s.id,
              label: `${s.name} (${s.code})`,
            })),
          ]}
        />
        <SelectField
          label="Categoria"
          value={filters.categoryId || 'ALL'}
          onChange={(e) =>
            onFilterChange(
              'categoryId',
              e.target.value === 'ALL' ? '' : e.target.value,
            )
          }
          options={[
            { value: 'ALL', label: 'Todas' },
            ...(lookups?.categories.map((c) => ({
              value: c.id,
              label: c.name,
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
          label="Conta bancária/caixa"
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
          label="Origem"
          value={filters.origin}
          onChange={(e) => onFilterChange('origin', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'MANUAL', label: 'Lançamento manual' },
            { value: 'PURCHASE', label: 'Compra' },
            { value: 'PURCHASE_ORDER', label: 'Pedido de compra' },
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

      <div className={detail ? styles.layoutWithDetail : styles.layout}>
        <section className={styles.main}>
          <div className={styles.desktopTable}>
            <Table
              columns={columns}
              rows={items}
              rowKey={(row) => row.id}
              loading={loading}
              emptyTitle="Nenhuma conta a pagar encontrada"
              emptyDescription="As obrigações criadas através de compras ou lançamentos financeiros aparecerão aqui."
              onRowClick={(row) => onSelect(row.id)}
              selectedKey={detail?.id ?? null}
            />
          </div>
          <div className={styles.mobileList}>
            {loading ? (
              <p className={styles.muted}>Carregando…</p>
            ) : items.length === 0 ? (
              <div className={styles.emptyState}>
                <h2>Nenhuma conta a pagar encontrada</h2>
                <p>
                  As obrigações criadas através de compras ou lançamentos
                  financeiros aparecerão aqui.
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
                    <strong>{row.supplier.name}</strong>
                    <Badge
                      variant={badgeVariantForPayableStatus(row.displayStatus)}
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
                  variant={badgeVariantForPayableStatus(detail.displayStatus)}
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
            {detail.requiresApproval ? (
              <Alert variant="warn">
                Aprovação:{' '}
                {APPROVAL_STATUS_LABELS[detail.approvalStatus ?? 'NONE'] ??
                  detail.approvalStatus}
              </Alert>
            ) : null}

            <h3>Fornecedor</h3>
            <dl className={styles.facts}>
              <div>
                <dt>Nome</dt>
                <dd>{detail.supplier.name}</dd>
              </div>
              <div>
                <dt>CNPJ/CPF</dt>
                <dd>{detail.supplier.document ?? '—'}</dd>
              </div>
              <div>
                <dt>Telefone</dt>
                <dd>{detail.supplier.phone ?? '—'}</dd>
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
                <dt>Valor pago</dt>
                <dd>{formatMoney(detail.paidAmount)}</dd>
              </div>
              <div>
                <dt>Saldo</dt>
                <dd>
                  <strong>{formatMoney(detail.balance)}</strong>
                </dd>
              </div>
              {detail.category ? (
                <div>
                  <dt>Categoria</dt>
                  <dd>{detail.category.name}</dd>
                </div>
              ) : null}
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
              {canPayDetail ? (
                <Button onClick={onOpenPay} disabled={busy}>
                  Registrar pagamento
                </Button>
              ) : null}
              {canScheduleDetail ? (
                <Button
                  variant="secondary"
                  onClick={onOpenSchedule}
                  disabled={busy}
                >
                  Agendar pagamento
                </Button>
              ) : null}
              {canRequestApproval ? (
                <Button
                  variant="secondary"
                  onClick={onRequestApproval}
                  disabled={busy}
                >
                  Solicitar aprovação
                </Button>
              ) : null}
              {canDecideApproval ? (
                <>
                  <Button onClick={onApprove} disabled={busy}>
                    Aprovar
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={onReject}
                    disabled={busy}
                  >
                    Rejeitar
                  </Button>
                </>
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
              {permissions.canCancel &&
              detail.status !== 'SETTLED' &&
              detail.status !== 'CANCELLED' ? (
                <Button variant="ghost" onClick={onCancel} disabled={busy}>
                  Cancelar conta
                </Button>
              ) : null}
            </div>

            <h3>Agendamentos</h3>
            <ul className={styles.simpleList}>
              {(detail.schedules?.length ?? 0) === 0 ? (
                <li className={styles.muted}>Nenhum agendamento.</li>
              ) : (
                detail.schedules?.map((s) => (
                  <li key={s.id}>
                    <div className={styles.stack}>
                      <strong>
                        {formatMoney(s.amount)} · {formatDateBR(s.scheduledDate)}
                      </strong>
                      <span className={styles.muted}>{s.status}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>

            <h3>Pagamentos</h3>
            <ul className={styles.simpleList}>
              {detail.movements.length === 0 ? (
                <li className={styles.muted}>Nenhum pagamento.</li>
              ) : (
                detail.movements.map((m) => (
                  <li key={m.id}>
                    <div className={styles.stack}>
                      <strong>
                        {m.type === 'REVERSAL' ? 'Estorno' : 'Pagamento'}{' '}
                        {formatMoney(m.amount)}
                      </strong>
                      <span className={styles.muted}>
                        {formatDateBR(m.paidAt)} · {m.operatorName}
                        {m.paymentMethodLabel ? ` · ${m.paymentMethodLabel}` : ''}
                      </span>
                    </div>
                    {permissions.canReverse &&
                    m.type === 'PAYMENT' &&
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
            label="Buscar fornecedor"
            value={supplierSearch}
            onChange={(e) => onSupplierSearchChange(e.target.value)}
          />
          <SelectField
            label="Fornecedor"
            value={createForm.supplierId}
            onChange={(e) => onCreateFormChange('supplierId', e.target.value)}
            options={[
              { value: '', label: 'Selecione' },
              ...suppliers.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.code})`,
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
          <SelectField
            label="Categoria"
            value={createForm.categoryId}
            onChange={(e) => onCreateFormChange('categoryId', e.target.value)}
            options={[
              { value: '', label: 'Opcional' },
              ...(lookups?.categories.map((c) => ({
                value: c.id,
                label: c.name,
              })) ?? []),
            ]}
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
            label="Forma de pagamento"
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
          <SelectField
            label="Exigir aprovação"
            value={createForm.requiresApproval}
            onChange={(e) =>
              onCreateFormChange('requiresApproval', e.target.value)
            }
            options={[
              { value: 'false', label: 'Não' },
              { value: 'true', label: 'Sim' },
            ]}
          />
          <Button loading={busy} onClick={onSubmitCreate}>
            Salvar conta
          </Button>
        </div>
      </Dialog>

      <Dialog open={payOpen} onClose={onClosePay} title="Registrar pagamento">
        <div className={styles.dialogBody}>
          {detail ? (
            <p className={styles.muted}>
              Saldo atual: <strong>{formatMoney(detail.balance)}</strong>
            </p>
          ) : null}
          <TextField
            label="Valor pago"
            value={payForm.amount}
            onChange={(e) => onPayFormChange('amount', e.target.value)}
          />
          <TextField
            label="Data do pagamento"
            type="date"
            value={payForm.paidAt}
            onChange={(e) => onPayFormChange('paidAt', e.target.value)}
          />
          <SelectField
            label="Forma de pagamento"
            value={payForm.paymentMethodId}
            onChange={(e) => onPayFormChange('paymentMethodId', e.target.value)}
            options={[
              { value: '', label: 'Selecione' },
              ...(lookups?.paymentMethods.map((m) => ({
                value: m.id,
                label: m.label,
              })) ?? []),
            ]}
          />
          <SelectField
            label="Conta de origem"
            value={payForm.bankAccountId}
            onChange={(e) => onPayFormChange('bankAccountId', e.target.value)}
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
              value={payForm.discountAmount}
              onChange={(e) =>
                onPayFormChange('discountAmount', e.target.value)
              }
              hint={`Limite do operador: ${lookups?.operatorDiscountLimitPercent ?? 10}%`}
            />
          ) : null}
          <TextField
            label="Observação"
            value={payForm.notes}
            onChange={(e) => onPayFormChange('notes', e.target.value)}
          />
          <Button loading={busy} onClick={onSubmitPay}>
            Confirmar pagamento
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={scheduleOpen}
        onClose={onCloseSchedule}
        title="Agendar pagamento"
      >
        <div className={styles.dialogBody}>
          {detail ? (
            <p className={styles.muted}>
              Saldo atual: <strong>{formatMoney(detail.balance)}</strong>
            </p>
          ) : null}
          <TextField
            label="Data agendada"
            type="date"
            value={scheduleForm.scheduledDate}
            onChange={(e) =>
              onScheduleFormChange('scheduledDate', e.target.value)
            }
          />
          <TextField
            label="Valor"
            value={scheduleForm.amount}
            onChange={(e) => onScheduleFormChange('amount', e.target.value)}
          />
          <SelectField
            label="Forma de pagamento"
            value={scheduleForm.paymentMethodId}
            onChange={(e) =>
              onScheduleFormChange('paymentMethodId', e.target.value)
            }
            options={[
              { value: '', label: 'Opcional' },
              ...(lookups?.paymentMethods.map((m) => ({
                value: m.id,
                label: m.label,
              })) ?? []),
            ]}
          />
          <SelectField
            label="Conta bancária/caixa"
            value={scheduleForm.bankAccountId}
            onChange={(e) =>
              onScheduleFormChange('bankAccountId', e.target.value)
            }
            options={[
              { value: '', label: 'Opcional' },
              ...(lookups?.bankAccounts.map((a) => ({
                value: a.id,
                label: a.name,
              })) ?? []),
            ]}
          />
          <TextField
            label="Observação"
            value={scheduleForm.notes}
            onChange={(e) => onScheduleFormChange('notes', e.target.value)}
          />
          <Button loading={busy} onClick={onSubmitSchedule}>
            Confirmar agendamento
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={renegotiateOpen}
        onClose={onCloseRenegotiate}
        title="Renegociar obrigação"
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
