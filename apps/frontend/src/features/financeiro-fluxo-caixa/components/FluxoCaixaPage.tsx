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
  DIRECTION_LABELS,
  KIND_LABELS,
  ORIGIN_LABELS,
  PAGE_DESCRIPTION,
  PERIOD_OPTIONS,
  STATUS_LABELS,
  badgeVariantForDirection,
  badgeVariantForStatus,
  formatDateBR,
  formatMoney,
  formatPct,
  type CashFlowMovementDetail,
  type CashFlowMovementListItem,
  type FluxoCaixaAnalysis,
  type FluxoCaixaBalances,
  type FluxoCaixaDashboard,
  type FluxoCaixaLookups,
  type FluxoCaixaProjection,
  type FluxoCaixaSeries,
} from '../domain/fluxo-caixa.schema'
import styles from './FluxoCaixaPage.module.css'

export type FluxoCaixaPageProps = {
  items: CashFlowMovementListItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  dashboard: FluxoCaixaDashboard | null
  series: FluxoCaixaSeries | null
  projection: FluxoCaixaProjection | null
  analysis: FluxoCaixaAnalysis | null
  balances: FluxoCaixaBalances | null
  lookups: FluxoCaixaLookups | null
  detail: CashFlowMovementDetail | null
  detailLoading: boolean
  loading: boolean
  busy: boolean
  error: string | null
  searchDraft: string
  filters: {
    period: string
    from: string
    to: string
    direction: string
    status: string
    bankAccountId: string
    categoryId: string
    costCenterId: string
    origin: string
  }
  createOpen: boolean
  transferOpen: boolean
  createForm: Record<string, string>
  transferForm: Record<string, string>
  permissions: {
    canCreate: boolean
    canTransfer: boolean
    canCancel: boolean
    canReverse: boolean
    canExport: boolean
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
  onSubmitCreate: () => void
  onOpenTransfer: () => void
  onCloseTransfer: () => void
  onTransferFormChange: (key: string, value: string) => void
  onSubmitTransfer: () => void
  onCancel: () => void
  onReverse: () => void
  onExport: () => void
  onRefresh: () => void
}

function BalanceChart({ series }: { series: FluxoCaixaSeries | null }) {
  const points = series?.points ?? []
  if (points.length === 0) {
    return <div className={styles.empty}>Sem dados de evolução no período.</div>
  }
  const values = points.flatMap((p) => [p.balanceRealized, p.balanceProjected])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 560
  const h = 160
  const pad = 12
  const toX = (i: number) =>
    pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2)
  const toY = (v: number) => pad + ((max - v) / span) * (h - pad * 2)
  const realized = points
    .map((p, i) => `${toX(i)},${toY(p.balanceRealized)}`)
    .join(' ')
  const projected = points
    .map((p, i) => `${toX(i)},${toY(p.balanceProjected)}`)
    .join(' ')
  return (
    <svg
      className={styles.chartSvg}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Evolução do saldo"
    >
      <polyline
        fill="none"
        stroke="var(--fm-dark)"
        strokeWidth="2.5"
        points={realized}
      />
      <polyline
        fill="none"
        stroke="var(--fm-gold)"
        strokeWidth="2"
        strokeDasharray="5 4"
        points={projected}
      />
    </svg>
  )
}

function BarsChart({ series }: { series: FluxoCaixaSeries | null }) {
  const points = (series?.points ?? []).slice(-12)
  if (points.length === 0) {
    return <div className={styles.empty}>Sem dados de entradas/saídas.</div>
  }
  const max = Math.max(
    ...points.flatMap((p) => [p.inflows, p.outflows]),
    1,
  )
  const w = 560
  const h = 160
  const pad = 12
  const groupW = (w - pad * 2) / points.length
  return (
    <svg
      className={styles.chartSvg}
      viewBox={`0 0 ${w} ${h}`}
      role="img"
      aria-label="Entradas versus saídas"
    >
      {points.map((p, i) => {
        const x = pad + i * groupW
        const inH = (p.inflows / max) * (h - pad * 2)
        const outH = (p.outflows / max) * (h - pad * 2)
        const barW = Math.max(4, groupW * 0.28)
        return (
          <g key={p.date}>
            <rect
              x={x + groupW * 0.2}
              y={h - pad - inH}
              width={barW}
              height={inH}
              fill="var(--fm-success)"
              rx="2"
            />
            <rect
              x={x + groupW * 0.52}
              y={h - pad - outH}
              width={barW}
              height={outH}
              fill="var(--fm-danger)"
              rx="2"
            />
          </g>
        )
      })}
    </svg>
  )
}

export function FluxoCaixaPage(props: FluxoCaixaPageProps) {
  const {
    items,
    total,
    page,
    pageSize,
    totalPages,
    dashboard,
    series,
    projection,
    analysis,
    balances,
    lookups,
    detail,
    detailLoading,
    loading,
    busy,
    error,
    searchDraft,
    filters,
    createOpen,
    transferOpen,
    createForm,
    transferForm,
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
    onSubmitCreate,
    onOpenTransfer,
    onCloseTransfer,
    onTransferFormChange,
    onSubmitTransfer,
    onCancel,
    onReverse,
    onExport,
    onRefresh,
  } = props

  const columns: TableColumn<CashFlowMovementListItem>[] = [
    {
      id: 'number',
      header: 'Nº',
      cell: (row) => row.number,
    },
    {
      id: 'occurredAt',
      header: 'Data',
      cell: (row) => formatDateBR(row.occurredAt),
    },
    {
      id: 'description',
      header: 'Descrição',
      cell: (row) => row.description,
    },
    {
      id: 'direction',
      header: 'Tipo',
      cell: (row) => (
        <Badge variant={badgeVariantForDirection(row.direction)}>
          {DIRECTION_LABELS[row.direction] ?? row.direction}
        </Badge>
      ),
    },
    {
      id: 'amount',
      header: 'Valor',
      cell: (row) => (
        <span
          className={row.direction === 'IN' ? styles.positive : styles.negative}
        >
          {formatMoney(row.amount)}
        </span>
      ),
    },
    {
      id: 'account',
      header: 'Conta',
      cell: (row) => row.bankAccount.name,
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={badgeVariantForStatus(row.status)}>
          {STATUS_LABELS[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: 'running',
      header: 'Saldo',
      cell: (row) => formatMoney(row.runningBalance),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        title="Fluxo de Caixa"
        description={PAGE_DESCRIPTION}
        breadcrumbs={[
          { label: 'Financeiro', path: '/app/financeiro/fluxo-caixa' },
          { label: 'Fluxo de Caixa' },
        ]}
        actions={
          <>
            <SelectField
              label="Período"
              value={filters.period}
              onChange={(e) => onFilterChange('period', e.target.value)}
              options={PERIOD_OPTIONS.map((o) => ({
                value: o.value,
                label: o.label,
              }))}
            />
            {permissions.canExport ? (
              <Button variant="secondary" onClick={onExport} disabled={busy}>
                Exportar
              </Button>
            ) : null}
            {permissions.canTransfer ? (
              <Button variant="secondary" onClick={onOpenTransfer} disabled={busy}>
                Transferência
              </Button>
            ) : null}
            {permissions.canCreate ? (
              <Button onClick={onOpenCreate} disabled={busy}>
                Nova movimentação
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {dashboard?.risk ? (
        <Alert variant="warn">
          Risco de saldo negativo projetado
          {dashboard.risk.minProjectedDate
            ? ` (mín. ${formatMoney(dashboard.risk.minProjectedBalance)} em ${formatDateBR(dashboard.risk.minProjectedDate)})`
            : ''}
          .
        </Alert>
      ) : null}

      <div className={styles.metrics}>
        <MetricCard
          label="Saldo atual"
          value={formatMoney(dashboard?.currentBalance)}
        />
        <MetricCard
          label="Entradas"
          value={formatMoney(dashboard?.periodInflows)}
          tone="success"
        />
        <MetricCard
          label="Saídas"
          value={formatMoney(dashboard?.periodOutflows)}
          tone="danger"
        />
        <MetricCard
          label="Resultado"
          value={formatMoney(dashboard?.result)}
          tone={(dashboard?.result ?? 0) >= 0 ? 'success' : 'danger'}
        />
        <MetricCard
          label="Saldo projetado"
          value={formatMoney(dashboard?.projectedBalance)}
          tone={(dashboard?.projectedBalance ?? 0) >= 0 ? 'success' : 'danger'}
        />
      </div>

      <div className={styles.filters}>
        <TextField
          label="Busca"
          value={searchDraft}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Descrição, notas…"
        />
        <SelectField
          label="Tipo"
          value={filters.direction}
          onChange={(e) => onFilterChange('direction', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'IN', label: 'Entradas' },
            { value: 'OUT', label: 'Saídas' },
          ]}
        />
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'REALIZED', label: 'Realizada' },
            { value: 'REVERSED', label: 'Estornada' },
            { value: 'CANCELLED', label: 'Cancelada' },
          ]}
        />
        <SelectField
          label="Conta"
          value={filters.bankAccountId}
          onChange={(e) => onFilterChange('bankAccountId', e.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...(lookups?.bankAccounts.map((a) => ({
              value: a.id,
              label: `${a.code} — ${a.name}`,
            })) ?? []),
          ]}
        />
        <SelectField
          label="Categoria"
          value={filters.categoryId}
          onChange={(e) => onFilterChange('categoryId', e.target.value)}
          options={[
            { value: '', label: 'Todas' },
            ...(lookups?.categories.map((c) => ({
              value: c.id,
              label: c.name,
            })) ?? []),
          ]}
        />
        <SelectField
          label="Centro de custo"
          value={filters.costCenterId}
          onChange={(e) => onFilterChange('costCenterId', e.target.value)}
          options={[
            { value: '', label: 'Todos' },
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
            ...Object.entries(ORIGIN_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          ]}
        />
        {filters.period === 'CUSTOM' ? (
          <>
            <TextField
              label="De"
              type="date"
              value={filters.from}
              onChange={(e) => onFilterChange('from', e.target.value)}
            />
            <TextField
              label="Até"
              type="date"
              value={filters.to}
              onChange={(e) => onFilterChange('to', e.target.value)}
            />
          </>
        ) : null}
        <div className={styles.filterActions}>
          <Button variant="secondary" onClick={onClearFilters}>
            Limpar
          </Button>
          <Button variant="secondary" onClick={onRefresh} disabled={loading}>
            Atualizar
          </Button>
        </div>
      </div>

      <div className={styles.charts}>
        <section className={styles.panel}>
          <h3>Evolução do saldo</h3>
          <BalanceChart series={series} />
          <div className={styles.chartLegend}>
            <span>
              <i
                className={styles.legendDot}
                style={{ background: 'var(--fm-dark)' }}
              />
              Realizado
            </span>
            <span>
              <i
                className={styles.legendDot}
                style={{ background: 'var(--fm-gold)' }}
              />
              Projetado
            </span>
          </div>
        </section>
        <section className={styles.panel}>
          <h3>Entradas × saídas</h3>
          <BarsChart series={series} />
          <div className={styles.chartLegend}>
            <span>
              <i
                className={styles.legendDot}
                style={{ background: 'var(--fm-success)' }}
              />
              Entradas
            </span>
            <span>
              <i
                className={styles.legendDot}
                style={{ background: 'var(--fm-danger)' }}
              />
              Saídas
            </span>
          </div>
        </section>
      </div>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <h3>Projeção</h3>
          {projection ? (
            <>
              <div className={styles.summaryRow}>
                <span className={styles.muted}>Saldo atual</span>
                <strong>{formatMoney(projection.currentBalance)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.muted}>A receber</span>
                <strong className={styles.positive}>
                  {formatMoney(projection.toReceive)}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.muted}>A pagar</span>
                <strong className={styles.negative}>
                  {formatMoney(projection.toPay)}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.muted}>Saldo projetado</span>
                <strong
                  className={
                    projection.projectedBalance >= 0
                      ? styles.positive
                      : styles.negative
                  }
                >
                  {formatMoney(projection.projectedBalance)}
                </strong>
              </div>
            </>
          ) : (
            <div className={styles.empty}>Carregando projeção…</div>
          )}
        </section>

        <section className={styles.panel}>
          <h3>Comparativo do período</h3>
          {dashboard?.comparison ? (
            <>
              <div className={styles.summaryRow}>
                <span className={styles.muted}>Entradas ant.</span>
                <span>
                  {formatMoney(dashboard.comparison.previousInflows)} (
                  {formatPct(dashboard.comparison.inflowsChangePct)})
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.muted}>Saídas ant.</span>
                <span>
                  {formatMoney(dashboard.comparison.previousOutflows)} (
                  {formatPct(dashboard.comparison.outflowsChangePct)})
                </span>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.muted}>Resultado ant.</span>
                <span>
                  {formatMoney(dashboard.comparison.previousResult)} (
                  {formatPct(dashboard.comparison.resultChangePct)})
                </span>
              </div>
            </>
          ) : (
            <div className={styles.empty}>Sem comparativo.</div>
          )}
        </section>
      </div>

      <div className={styles.grid2}>
        <section className={styles.panel}>
          <h3>Compromissos previstos</h3>
          {projection?.upcoming?.length ? (
            <ul className={styles.list}>
              {projection.upcoming.slice(0, 8).map((u) => (
                <li
                  key={`${u.originId}-${u.date}`}
                  className={styles.listItem}
                >
                  <div>
                    <div>{u.description}</div>
                    <div className={styles.cardMeta}>
                      {formatDateBR(u.date)} ·{' '}
                      {ORIGIN_LABELS[u.origin] ?? u.origin}
                    </div>
                  </div>
                  <strong
                    className={
                      u.direction === 'IN' ? styles.positive : styles.negative
                    }
                  >
                    {formatMoney(u.amount)}
                  </strong>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.empty}>Nenhum compromisso no horizonte.</div>
          )}
        </section>

        <section className={styles.panel}>
          <h3>Análise por categoria</h3>
          {analysis?.items?.length ? (
            <table className={styles.compactTable}>
              <thead>
                <tr>
                  <th>Categoria</th>
                  <th>Origem</th>
                  <th>Valor</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {analysis.items.slice(0, 8).map((item) => (
                  <tr key={`${item.categoryId}-${item.origin}`}>
                    <td>{item.categoryName}</td>
                    <td>{ORIGIN_LABELS[item.origin] ?? item.origin}</td>
                    <td>{formatMoney(item.amount)}</td>
                    <td>{formatPct(item.sharePct)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className={styles.empty}>Sem dados de análise.</div>
          )}
        </section>
      </div>

      <section className={styles.panel}>
        <h3>Saldos por conta</h3>
        {balances?.items?.length ? (
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>Conta</th>
                <th>Saldo</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              {balances.items.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.code} — {a.name}
                  </td>
                  <td>{formatMoney(a.balance)}</td>
                  <td className={styles.positive}>{formatMoney(a.inflows)}</td>
                  <td className={styles.negative}>{formatMoney(a.outflows)}</td>
                  <td
                    className={
                      a.result >= 0 ? styles.positive : styles.negative
                    }
                  >
                    {formatMoney(a.result)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.empty}>Sem contas para exibir.</div>
        )}
      </section>

      <section className={styles.panel}>
        <h3>Projeção por data</h3>
        {projection?.byDate?.some((d) => d.inflows || d.outflows) ? (
          <table className={styles.compactTable}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Entradas</th>
                <th>Saídas</th>
                <th>Resultado</th>
                <th>Saldo proj.</th>
              </tr>
            </thead>
            <tbody>
              {projection.byDate
                .filter((d) => d.inflows || d.outflows)
                .slice(0, 15)
                .map((d) => (
                  <tr key={d.date}>
                    <td>{formatDateBR(d.date)}</td>
                    <td className={styles.positive}>
                      {formatMoney(d.inflows)}
                    </td>
                    <td className={styles.negative}>
                      {formatMoney(d.outflows)}
                    </td>
                    <td>{formatMoney(d.result)}</td>
                    <td>{formatMoney(d.projectedBalance)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className={styles.empty}>Sem movimentação projetada.</div>
        )}
      </section>

      <div
        className={detail ? styles.layoutWithDetail : styles.layout}
      >
        <div className={styles.main}>
          <div className={`${styles.tableWrap} ${styles.desktopTable}`}>
            {loading ? (
              <div className={styles.empty}>Carregando movimentações…</div>
            ) : items.length === 0 ? (
              <div className={styles.empty}>
                Nenhuma movimentação no período filtrado.
              </div>
            ) : (
              <Table
                columns={columns}
                rows={items}
                rowKey={(row) => row.id}
                onRowClick={(row) => onSelect(row.id)}
              />
            )}
          </div>

          <div className={styles.mobileCards}>
            {loading ? (
              <div className={styles.empty}>Carregando…</div>
            ) : items.length === 0 ? (
              <div className={styles.empty}>Sem movimentações.</div>
            ) : (
              items.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={styles.card}
                  onClick={() => onSelect(row.id)}
                >
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardTitle}>{row.description}</p>
                      <div className={styles.cardMeta}>
                        {row.number} · {formatDateBR(row.occurredAt)}
                      </div>
                    </div>
                    <Badge variant={badgeVariantForDirection(row.direction)}>
                      {DIRECTION_LABELS[row.direction]}
                    </Badge>
                  </div>
                  <div className={styles.cardTop}>
                    <span
                      className={
                        row.direction === 'IN'
                          ? styles.positive
                          : styles.negative
                      }
                    >
                      {formatMoney(row.amount)}
                    </span>
                    <Badge variant={badgeVariantForStatus(row.status)}>
                      {STATUS_LABELS[row.status]}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>

        {detail ? (
          <aside className={styles.detail}>
            <div className={styles.detailHeader}>
              <div>
                <h2>{detail.number}</h2>
                <div className={styles.cardMeta}>{detail.description}</div>
              </div>
              <Button variant="secondary" onClick={onCloseDetail}>
                Fechar
              </Button>
            </div>
            {detailLoading ? (
              <div className={styles.empty}>Carregando detalhe…</div>
            ) : (
              <>
                <div className={styles.detailMeta}>
                  <div>
                    <span className={styles.muted}>Tipo: </span>
                    {DIRECTION_LABELS[detail.direction]} ·{' '}
                    {KIND_LABELS[detail.kind] ?? detail.kind}
                  </div>
                  <div>
                    <span className={styles.muted}>Valor: </span>
                    {formatMoney(detail.amount)}
                  </div>
                  <div>
                    <span className={styles.muted}>Data: </span>
                    {formatDateBR(detail.occurredAt)}
                  </div>
                  <div>
                    <span className={styles.muted}>Conta: </span>
                    {detail.bankAccount.name}
                  </div>
                  <div>
                    <span className={styles.muted}>Status: </span>
                    {STATUS_LABELS[detail.status]}
                  </div>
                  <div>
                    <span className={styles.muted}>Origem: </span>
                    {ORIGIN_LABELS[detail.origin] ?? detail.origin}
                  </div>
                  {detail.notes ? (
                    <div>
                      <span className={styles.muted}>Notas: </span>
                      {detail.notes}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {permissions.canReverse && detail.status === 'REALIZED' ? (
                    <Button
                      variant="secondary"
                      onClick={onReverse}
                      disabled={busy}
                    >
                      Estornar
                    </Button>
                  ) : null}
                  {permissions.canCancel && detail.status === 'REALIZED' ? (
                    <Button
                      variant="secondary"
                      onClick={onCancel}
                      disabled={busy}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                </div>
                {detail.auditLogs?.length ? (
                  <>
                    <h3>Auditoria</h3>
                    <ul className={styles.list}>
                      {detail.auditLogs.map((log) => (
                        <li key={log.id} className={styles.listItem}>
                          <div>
                            <div>{log.action}</div>
                            <div className={styles.cardMeta}>
                              {log.actorName} ·{' '}
                              {formatDateBR(log.createdAt.slice(0, 10))}
                            </div>
                          </div>
                          <span>{formatMoney(log.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </>
            )}
          </aside>
        ) : null}
      </div>

      <Dialog
        open={createOpen}
        onClose={onCloseCreate}
        title="Nova movimentação"
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <SelectField
            label="Direção"
            value={createForm.direction}
            onChange={(e) => onCreateFormChange('direction', e.target.value)}
            options={[
              { value: 'IN', label: 'Entrada' },
              { value: 'OUT', label: 'Saída' },
            ]}
          />
          <TextField
            label="Valor"
            value={createForm.amount}
            onChange={(e) => onCreateFormChange('amount', e.target.value)}
          />
          <TextField
            label="Data"
            type="date"
            value={createForm.occurredAt}
            onChange={(e) => onCreateFormChange('occurredAt', e.target.value)}
          />
          <TextField
            label="Descrição"
            value={createForm.description}
            onChange={(e) => onCreateFormChange('description', e.target.value)}
          />
          <SelectField
            label="Conta"
            value={createForm.bankAccountId}
            onChange={(e) =>
              onCreateFormChange('bankAccountId', e.target.value)
            }
            options={
              lookups?.bankAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
              })) ?? []
            }
          />
          <SelectField
            label="Categoria"
            value={createForm.categoryId}
            onChange={(e) => onCreateFormChange('categoryId', e.target.value)}
            options={[
              { value: '', label: 'Nenhuma' },
              ...(lookups?.categories.map((c) => ({
                value: c.id,
                label: c.name,
              })) ?? []),
            ]}
          />
          <SelectField
            label="Centro de custo"
            value={createForm.costCenterId}
            onChange={(e) => onCreateFormChange('costCenterId', e.target.value)}
            options={[
              { value: '', label: 'Nenhum' },
              ...(lookups?.costCenters.map((c) => ({
                value: c.id,
                label: c.name,
              })) ?? []),
            ]}
          />
          <TextField
            label="Notas"
            value={createForm.notes}
            onChange={(e) => onCreateFormChange('notes', e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onCloseCreate}>
              Cancelar
            </Button>
            <Button onClick={onSubmitCreate} disabled={busy}>
              Salvar
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        open={transferOpen}
        onClose={onCloseTransfer}
        title="Transferência entre contas"
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <TextField
            label="Valor"
            value={transferForm.amount}
            onChange={(e) => onTransferFormChange('amount', e.target.value)}
          />
          <TextField
            label="Data"
            type="date"
            value={transferForm.occurredAt}
            onChange={(e) =>
              onTransferFormChange('occurredAt', e.target.value)
            }
          />
          <SelectField
            label="De"
            value={transferForm.fromBankAccountId}
            onChange={(e) =>
              onTransferFormChange('fromBankAccountId', e.target.value)
            }
            options={
              lookups?.bankAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
              })) ?? []
            }
          />
          <SelectField
            label="Para"
            value={transferForm.toBankAccountId}
            onChange={(e) =>
              onTransferFormChange('toBankAccountId', e.target.value)
            }
            options={
              lookups?.bankAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
              })) ?? []
            }
          />
          <TextField
            label="Descrição"
            value={transferForm.description}
            onChange={(e) =>
              onTransferFormChange('description', e.target.value)
            }
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onCloseTransfer}>
              Cancelar
            </Button>
            <Button onClick={onSubmitTransfer} disabled={busy}>
              Transferir
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
