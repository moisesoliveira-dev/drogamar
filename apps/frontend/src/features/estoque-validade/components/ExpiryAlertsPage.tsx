import { Button } from '../../../shared/ui/Button'
import { Badge } from '../../../shared/ui/Badge'
import { Checkbox } from '../../../shared/ui/Checkbox'
import { Dialog } from '../../../shared/ui/Dialog'
import { MetricCard } from '../../../shared/ui/MetricCard'
import { Pagination } from '../../../shared/ui/Pagination'
import { SelectField } from '../../../shared/ui/SelectField'
import { Table, type TableColumn } from '../../../shared/ui/Table'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import {
  badgeVariantForStatus,
  formatCurrencyBRL,
  formatDateBR,
  validadeConfig,
  type ExpiryAlertItem,
  type LotDetail,
  type StockLookupsLite,
} from '../domain/expiry.schema'
import styles from './ExpiryAlertsPage.module.css'

export type ExpiryAlertsPageProps = {
  items: ExpiryAlertItem[]
  summary: {
    expiredCount: number
    expiresIn7Count: number
    expiresIn30Count: number
    attentionCount: number
    valueAtRisk: number
    alertWindowDays: number
  } | null
  total: number
  page: number
  pageSize: number
  totalPages: number
  loading: boolean
  error: string | null
  lookups: StockLookupsLite | null
  draft: {
    alertWindowDays: number
    status: string
    search: string
    categoryId: string
    brandId: string
    lotNumber: string
    locationId: string
    expiryFrom: string
    expiryTo: string
    onlyWithQuantity: boolean
  }
  sortBy: string
  sortDir: 'asc' | 'desc'
  lotDetail: LotDetail | null
  lotLoading?: boolean
  canConfigureWindow: boolean
  canExport: boolean
  onDraftChange: (key: string, value: string | number | boolean) => void
  onApplyFilters: () => void
  onClearFilters: () => void
  onSortChange: (sortBy: string) => void
  onPageChange: (page: number) => void
  onRefresh: () => void
  onExport: () => void
  onRetry: () => void
  onViewItem: (itemId: string) => void
  onViewLot: (lotId: string) => void
  onCloseLot: () => void
  onAlertWindowChange: (days: number) => void
}

export function ExpiryAlertsPage(props: ExpiryAlertsPageProps) {
  const {
    items,
    summary,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    lookups,
    draft,
    sortBy,
    sortDir,
    lotDetail,
    lotLoading,
    canConfigureWindow,
  } = props

  const columns: TableColumn<ExpiryAlertItem>[] = [
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={badgeVariantForStatus(row.statusKind)}>
          {row.statusLabel}
        </Badge>
      ),
    },
    {
      id: 'item',
      header: 'Item',
      sortable: true,
      cell: (row) => (
        <div>
          <div>{row.item.description}</div>
          <div style={{ color: 'var(--fm-muted)', fontSize: 11 }}>
            {row.item.code}
            {row.item.sku ? ` · ${row.item.sku}` : ''}
          </div>
        </div>
      ),
    },
    {
      id: 'lotNumber',
      header: 'Lote',
      cell: (row) => row.lotNumber,
    },
    {
      id: 'quantity',
      header: 'Qtd.',
      sortable: true,
      align: 'right',
      cell: (row) =>
        `${row.quantity}${row.item.measureUnitCode ? ` ${row.item.measureUnitCode}` : ''}`,
    },
    {
      id: 'manufacturingDate',
      header: 'Fabricação',
      cell: (row) => formatDateBR(row.manufacturingDate),
    },
    {
      id: 'expiryDate',
      header: 'Validade',
      sortable: true,
      cell: (row) => formatDateBR(row.expiryDate),
    },
    {
      id: 'daysRemaining',
      header: 'Dias',
      sortable: true,
      align: 'right',
      cell: (row) => row.daysRemaining,
    },
    {
      id: 'location',
      header: 'Localização',
      cell: (row) => row.locationName ?? '—',
    },
    {
      id: 'valueAtRisk',
      header: 'Valor em risco',
      sortable: true,
      align: 'right',
      cell: (row) => formatCurrencyBRL(row.valueAtRisk),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) => (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => props.onViewLot(row.id)}
          >
            Ver lote
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => props.onViewItem(row.item.id)}
          >
            Ver item
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumbs={[
          { label: 'Estoque', path: '/app/estoque/itens' },
          { label: 'F2 — Alerta de Validade' },
        ]}
        title="Alerta de Validade"
        description="Acompanhe os itens próximos do vencimento e evite perdas de estoque."
        actions={
          <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            {props.canExport ? (
              <Button type="button" variant="secondary" onClick={props.onExport}>
                Exportar
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={props.onRefresh}>
              Atualizar
            </Button>
          </div>
        }
      />

      <div className={styles.metrics}>
        <MetricCard
          label="Itens vencidos"
          value={summary?.expiredCount ?? 0}
          tone="danger"
          loading={loading && !summary}
        />
        <MetricCard
          label="Vencem em 7 dias"
          value={summary?.expiresIn7Count ?? 0}
          tone="warn"
          loading={loading && !summary}
        />
        <MetricCard
          label="Vencem em 30 dias"
          value={summary?.expiresIn30Count ?? 0}
          tone="info"
          loading={loading && !summary}
        />
        <MetricCard
          label="Em atenção"
          value={summary?.attentionCount ?? 0}
          hint={`Janela: ${summary?.alertWindowDays ?? draft.alertWindowDays} dias`}
          tone="warn"
          loading={loading && !summary}
        />
        <MetricCard
          label="Valor em risco"
          value={formatCurrencyBRL(summary?.valueAtRisk ?? 0)}
          hint="Quantidade × custo do item"
          loading={loading && !summary}
        />
      </div>

      <div className={styles.toolbar}>
        {canConfigureWindow ? (
          <div className={styles.window}>
            <SelectField
              label="Alertar itens que vencem em"
              value={String(draft.alertWindowDays)}
              emptyLabel="—"
              options={validadeConfig.alertWindowOptions.map((d) => ({
                value: String(d),
                label: `${d} dias`,
              }))}
              onChange={(e) =>
                props.onAlertWindowChange(Number(e.target.value))
              }
            />
          </div>
        ) : null}
      </div>

      <div className={styles.filters}>
        <SelectField
          label="Status"
          value={draft.status}
          emptyLabel="Todos"
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'EXPIRED', label: 'Vencidos' },
            { value: 'EXPIRES_TODAY', label: 'Vencem hoje' },
            { value: 'EXPIRES_IN_7', label: 'Vencem em 7 dias' },
            { value: 'EXPIRES_IN_15', label: 'Vencem em 15 dias' },
            { value: 'EXPIRES_IN_30', label: 'Vencem em 30 dias' },
            { value: 'ATTENTION', label: 'Em atenção' },
            { value: 'REGULAR', label: 'Regulares' },
          ]}
          onChange={(e) => props.onDraftChange('status', e.target.value)}
        />
        <TextField
          label="Item"
          placeholder="Código, descrição, SKU..."
          value={draft.search}
          onChange={(e) => props.onDraftChange('search', e.target.value)}
        />
        <SelectField
          label="Categoria"
          value={draft.categoryId}
          options={(lookups?.categories ?? []).map((c) => ({
            value: c.id,
            label: c.label,
          }))}
          onChange={(e) => props.onDraftChange('categoryId', e.target.value)}
        />
        <SelectField
          label="Marca"
          value={draft.brandId}
          options={(lookups?.brands ?? []).map((b) => ({
            value: b.id,
            label: b.label,
          }))}
          onChange={(e) => props.onDraftChange('brandId', e.target.value)}
        />
        <TextField
          label="Lote"
          value={draft.lotNumber}
          onChange={(e) => props.onDraftChange('lotNumber', e.target.value)}
        />
        <SelectField
          label="Localização"
          value={draft.locationId}
          options={(lookups?.locations ?? []).map((l) => ({
            value: l.id,
            label: l.label,
          }))}
          onChange={(e) => props.onDraftChange('locationId', e.target.value)}
        />
        <TextField
          label="Validade de"
          type="date"
          value={draft.expiryFrom}
          onChange={(e) => props.onDraftChange('expiryFrom', e.target.value)}
        />
        <TextField
          label="Validade até"
          type="date"
          value={draft.expiryTo}
          onChange={(e) => props.onDraftChange('expiryTo', e.target.value)}
        />
        <Checkbox
          label="Somente com quantidade"
          checked={draft.onlyWithQuantity}
          onChange={(e) =>
            props.onDraftChange('onlyWithQuantity', e.target.checked)
          }
        />
        <div className={styles.filterActions}>
          <Button type="button" variant="ghost" onClick={props.onClearFilters}>
            Limpar filtros
          </Button>
          <Button type="button" onClick={props.onApplyFilters}>
            Aplicar filtros
          </Button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: 16,
            background: 'var(--fm-white)',
            border: '1px solid var(--fm-border)',
            borderRadius: 'var(--fm-radius-md)',
          }}
        >
          <p style={{ margin: '0 0 8px', fontWeight: 600 }}>{error}</p>
          <Button type="button" variant="secondary" onClick={props.onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <div className={styles.desktopTable}>
            <Table
              columns={columns}
              rows={items}
              rowKey={(row) => row.id}
              loading={loading}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={props.onSortChange}
              emptyTitle="Nenhum item próximo do vencimento"
              emptyDescription="Não existem itens dentro do período de alerta selecionado."
            />
          </div>

          <div className={styles.mobileList}>
            {loading ? (
              <p style={{ color: 'var(--fm-muted)' }}>Carregando…</p>
            ) : items.length === 0 ? (
              <div className={styles.card}>
                <p className={styles.cardTitle}>
                  Nenhum item próximo do vencimento
                </p>
                <p className={styles.cardMeta}>
                  Não existem itens dentro do período de alerta selecionado.
                </p>
              </div>
            ) : (
              items.map((row) => (
                <article key={row.id} className={styles.card}>
                  <div className={styles.cardTop}>
                    <div>
                      <p className={styles.cardTitle}>{row.item.description}</p>
                      <p className={styles.cardMeta}>
                        {row.lotNumber} · {row.item.code}
                      </p>
                    </div>
                    <Badge variant={badgeVariantForStatus(row.statusKind)}>
                      {row.statusLabel}
                    </Badge>
                  </div>
                  <p className={styles.cardMeta}>
                    Validade {formatDateBR(row.expiryDate)} ·{' '}
                    {row.quantity}
                    {row.item.measureUnitCode
                      ? ` ${row.item.measureUnitCode}`
                      : ''}
                  </p>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => props.onViewLot(row.id)}
                    >
                      Ver lote
                    </button>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => props.onViewItem(row.item.id)}
                    >
                      Ver item
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>

          {!loading ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={props.onPageChange}
            />
          ) : null}
        </>
      )}

      <Dialog
        open={Boolean(lotDetail) || Boolean(lotLoading)}
        title={lotDetail ? `Lote ${lotDetail.lotNumber}` : 'Carregando lote…'}
        description={
          lotDetail
            ? `${lotDetail.item.description} (${lotDetail.item.code})`
            : undefined
        }
        onClose={props.onCloseLot}
        footer={
          lotDetail ? (
            <>
              <Button type="button" variant="ghost" onClick={props.onCloseLot}>
                Fechar
              </Button>
              <Button
                type="button"
                onClick={() => props.onViewItem(lotDetail.item.id)}
              >
                Abrir item
              </Button>
            </>
          ) : (
            <Button type="button" variant="ghost" onClick={props.onCloseLot}>
              Fechar
            </Button>
          )
        }
      >
        {lotLoading ? (
          <p style={{ color: 'var(--fm-muted)' }}>Carregando detalhes…</p>
        ) : lotDetail ? (
          <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
            {lotDetail.statusKind === 'EXPIRED' ? (
              <p
                style={{
                  margin: 0,
                  padding: 10,
                  background: 'var(--fm-danger-bg)',
                  color: 'var(--fm-danger)',
                  borderRadius: 'var(--fm-radius-sm)',
                  fontWeight: 600,
                }}
              >
                VENCIDO — este lote requer atenção. Nenhuma alteração automática
                de estoque é feita apenas pelo vencimento.
              </p>
            ) : null}
            <p style={{ margin: 0 }}>
              <strong>Status:</strong> {lotDetail.statusLabel}
            </p>
            <p style={{ margin: 0 }}>
              <strong>SKU:</strong> {lotDetail.item.sku ?? '—'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Categoria:</strong> {lotDetail.item.categoryName ?? '—'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Marca:</strong> {lotDetail.item.brandName ?? '—'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Fabricação:</strong>{' '}
              {formatDateBR(lotDetail.manufacturingDate)}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Validade:</strong> {formatDateBR(lotDetail.expiryDate)}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Quantidade:</strong> {lotDetail.quantity}
              {lotDetail.item.measureUnitCode
                ? ` ${lotDetail.item.measureUnitCode}`
                : ''}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Localização:</strong> {lotDetail.locationName ?? '—'}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Entrada no estoque:</strong>{' '}
              {new Intl.DateTimeFormat('pt-BR', {
                dateStyle: 'short',
                timeStyle: 'short',
              }).format(new Date(lotDetail.enteredAt))}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Valor em risco:</strong>{' '}
              {formatCurrencyBRL(lotDetail.valueAtRisk)}
            </p>
            <p style={{ margin: 0, color: 'var(--fm-muted)' }}>
              {lotDetail.historyNote ??
                'Histórico de movimentações ainda não disponível.'}
            </p>
          </div>
        ) : null}
      </Dialog>
    </div>
  )
}
