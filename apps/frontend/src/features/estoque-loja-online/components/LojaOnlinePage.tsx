import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Checkbox } from '../../../shared/ui/Checkbox'
import { Dialog } from '../../../shared/ui/Dialog'
import { MetricCard } from '../../../shared/ui/MetricCard'
import { Pagination } from '../../../shared/ui/Pagination'
import { SelectField } from '../../../shared/ui/SelectField'
import { Table, type TableColumn } from '../../../shared/ui/Table'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import type { LojaLookups } from '../infrastructure/loja.api'
import {
  INTEGRATION_STATUS_LABELS,
  SYNC_JOB_STATUS_LABELS,
  type StoreOverview,
  type StoreProduct,
  type StoreProductDetail,
  type StoreSyncJob,
} from '../domain/loja.schema'
import styles from './LojaOnlinePage.module.css'

export type LojaOnlinePageProps = {
  overview: StoreOverview | null
  overviewLoading: boolean
  products: StoreProduct[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  productsLoading: boolean
  error: string | null
  lookups: LojaLookups | null
  filters: {
    search: string
    status: string
    categoryId: string
    brandId: string
    stock: string
    sync: string
    publish: string
  }
  selected: StoreProductDetail | null
  selectedLoading: boolean
  syncJobs: StoreSyncJob[]
  activeSync: StoreSyncJob | null
  syncDialogOpen: boolean
  syncOptions: { syncProducts: boolean; syncStock: boolean; syncPrices: boolean }
  configOpen: boolean
  configName: string
  configBaseUrl: string
  configCredentials: string
  saving?: boolean
  syncing?: boolean
  canConfigureChannel: boolean
  canSync: boolean
  canPublish: boolean
  canUnpublish: boolean
  canConfigureProduct: boolean
  canChangePrice: boolean
  canExport: boolean
  onSearchChange: (value: string) => void
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  onPageChange: (page: number) => void
  onSelectProduct: (itemId: string) => void
  onCloseProduct: () => void
  onSaveProduct: (body: Record<string, unknown>) => void
  onPublish: () => void
  onUnpublish: () => void
  onOpenSync: () => void
  onCloseSync: () => void
  onSyncOptionChange: (key: 'syncProducts' | 'syncStock' | 'syncPrices', value: boolean) => void
  onConfirmSync: () => void
  onOpenConfig: () => void
  onCloseConfig: () => void
  onConfigNameChange: (value: string) => void
  onConfigBaseUrlChange: (value: string) => void
  onConfigCredentialsChange: (value: string) => void
  onSaveConfig: () => void
  onDisconnect: () => void
  onExport: () => void
  onRefresh: () => void
  onSelectedFieldChange: (key: string, value: string | boolean | number | null) => void
}

function statusBadge(status: StoreProduct['integrationStatus']) {
  const label = INTEGRATION_STATUS_LABELS[status]
  if (status === 'PUBLISHED') return <Badge variant="success">{label}</Badge>
  if (status === 'ERROR') return <Badge variant="danger">{label}</Badge>
  if (status === 'PENDING') return <Badge variant="warn">{label}</Badge>
  if (status === 'UNAVAILABLE') return <Badge variant="neutral">{label}</Badge>
  return <Badge variant="neutral">{label}</Badge>
}

function formatMoney(value: number | null) {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function formatLastSync(value: string | null) {
  if (!value) return 'Nunca'
  const date = new Date(value)
  const today = new Date()
  const sameDay =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  const time = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  return sameDay ? `Hoje às ${time}` : date.toLocaleString('pt-BR')
}

export function LojaOnlinePage(props: LojaOnlinePageProps) {
  const connected = Boolean(props.overview?.connected)
  const metrics = props.overview?.metrics

  const columns: TableColumn<StoreProduct>[] = [
    {
      id: 'status',
      header: 'Status',
      cell: (row) => statusBadge(row.integrationStatus),
    },
    {
      id: 'product',
      header: 'Produto',
      cell: (row) => row.commercialName || row.description,
    },
    {
      id: 'sku',
      header: 'Código/SKU',
      cell: (row) => `${row.code}${row.sku ? ` / ${row.sku}` : ''}`,
    },
    {
      id: 'price',
      header: 'Preço',
      align: 'right',
      cell: (row) => formatMoney(row.storePrice),
    },
    {
      id: 'stock',
      header: 'Estoque',
      align: 'right',
      cell: (row) => row.physicalStock,
    },
    {
      id: 'available',
      header: 'Disponível',
      align: 'right',
      cell: (row) => row.availableStock,
    },
    {
      id: 'publish',
      header: 'Publicação',
      cell: (row) =>
        row.publishStatus === 'PUBLISHED'
          ? 'Publicado'
          : row.publishStatus === 'UNAVAILABLE'
            ? 'Indisponível'
            : 'Não publicado',
    },
    {
      id: 'synced',
      header: 'Última sync',
      cell: (row) => formatDateTime(row.lastSyncedAt),
    },
    {
      id: 'channel',
      header: 'Canal',
      cell: (row) => row.channelName,
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) => (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => props.onSelectProduct(row.itemId)}
          >
            Configurar
          </button>
        </div>
      ),
    },
  ]

  if (!connected && !props.overviewLoading) {
    return (
      <div className={styles.page}>
        <PageHeader
          breadcrumbs={[
            { label: 'Estoque', path: '/app/estoque/itens' },
            { label: 'F4 — Loja Online' },
          ]}
          title="Loja Online"
          description="Gerencie os produtos, estoque e sincronização com a loja online."
        />
        <div className={styles.emptyState}>
          <h2>Sua loja online ainda não está conectada</h2>
          <p>
            Conecte um canal de venda genérico para começar a sincronizar produtos e
            estoque a partir do cadastro do ERP. Credenciais ficam apenas no backend.
          </p>
          {props.canConfigureChannel ? (
            <Button type="button" onClick={props.onOpenConfig}>
              Configurar loja
            </Button>
          ) : null}
        </div>
        {props.configOpen ? renderConfigDialog(props) : null}
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumbs={[
          { label: 'Estoque', path: '/app/estoque/itens' },
          { label: 'F4 — Loja Online' },
        ]}
        title="Loja Online"
        description="Gerencie os produtos, estoque e sincronização com a loja online."
        actions={
          <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            {props.canExport ? (
              <Button type="button" variant="secondary" onClick={props.onExport}>
                Exportar
              </Button>
            ) : null}
            {props.canConfigureChannel ? (
              <Button type="button" variant="secondary" onClick={props.onOpenConfig}>
                Configurações
              </Button>
            ) : null}
            {props.canSync ? (
              <Button type="button" onClick={props.onOpenSync}>
                Sincronizar agora
              </Button>
            ) : null}
          </div>
        }
      />

      {props.error ? (
        <div className={styles.errorBanner} role="alert">
          {props.error}
        </div>
      ) : null}

      {props.overview?.channel ? (
        <div className={styles.channelBanner}>
          <div>
            <span className={styles.channelDot} aria-hidden="true" />
            <strong>Loja conectada:</strong> {props.overview.channel.name}
            <span style={{ marginLeft: 12, color: 'var(--fm-muted)' }}>
              Última sincronização: {formatLastSync(metrics?.lastSyncAt ?? null)}
            </span>
          </div>
          <Button type="button" variant="ghost" onClick={props.onRefresh}>
            Atualizar
          </Button>
        </div>
      ) : null}

      <div className={styles.metrics}>
        <MetricCard
          label="Produtos publicados"
          value={metrics?.publishedCount ?? 0}
          tone="success"
          loading={props.overviewLoading}
        />
        <MetricCard
          label="Não publicados"
          value={metrics?.notPublishedCount ?? 0}
          loading={props.overviewLoading}
        />
        <MetricCard
          label="Estoque sincronizado"
          value={metrics?.syncedCount ?? 0}
          tone="info"
          loading={props.overviewLoading}
        />
        <MetricCard
          label="Pendências"
          value={metrics?.pendingCount ?? 0}
          tone="warn"
          loading={props.overviewLoading}
        />
        <MetricCard
          label="Última sincronização"
          value={formatLastSync(metrics?.lastSyncAt ?? null)}
          loading={props.overviewLoading}
        />
      </div>

      {props.activeSync &&
      (props.activeSync.status === 'PENDING' ||
        props.activeSync.status === 'PROCESSING') ? (
        <div className={styles.section} aria-live="polite">
          <strong>Sincronização em andamento…</strong>
          <p style={{ margin: 0, color: 'var(--fm-muted)', fontSize: 12 }}>
            Job #{String(props.activeSync.sequentialId).padStart(6, '0')}
          </p>
        </div>
      ) : null}

      {props.activeSync &&
      (props.activeSync.status === 'COMPLETED' ||
        props.activeSync.status === 'COMPLETED_WITH_ERRORS') ? (
        <div className={styles.section} aria-live="polite">
          <strong>Sincronização concluída</strong>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
            <li>✓ {props.activeSync.productsSuccess} produtos sincronizados</li>
            <li>✓ {props.activeSync.stockUpdated} estoques atualizados</li>
            <li>⚠ {props.activeSync.pendingCount} produtos com pendências</li>
            <li>✕ {props.activeSync.productsError} produtos com erro</li>
          </ul>
        </div>
      ) : null}

      <div className={styles.filters}>
        <TextField
          label="Buscar"
          placeholder="Buscar produto..."
          value={props.filters.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
        />
        <SelectField
          label="Status"
          value={props.filters.status}
          onChange={(e) => props.onFilterChange('status', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'PUBLISHED', label: 'Publicado' },
            { value: 'NOT_PUBLISHED', label: 'Não publicado' },
            { value: 'PENDING', label: 'Pendente' },
            { value: 'ERROR', label: 'Com erro' },
            { value: 'UNAVAILABLE', label: 'Indisponível' },
          ]}
        />
        <SelectField
          label="Categoria"
          value={props.filters.categoryId}
          onChange={(e) => props.onFilterChange('categoryId', e.target.value)}
          placeholder="Todas"
          options={(props.lookups?.categories ?? []).map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />
        <SelectField
          label="Marca"
          value={props.filters.brandId}
          onChange={(e) => props.onFilterChange('brandId', e.target.value)}
          placeholder="Todas"
          options={(props.lookups?.brands ?? []).map((b) => ({
            value: b.id,
            label: b.label,
          }))}
        />
        <SelectField
          label="Estoque"
          value={props.filters.stock}
          onChange={(e) => props.onFilterChange('stock', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'WITH_STOCK', label: 'Com estoque' },
            { value: 'WITHOUT_STOCK', label: 'Sem estoque' },
            { value: 'LOW_STOCK', label: 'Estoque baixo' },
          ]}
        />
        <SelectField
          label="Sincronização"
          value={props.filters.sync}
          onChange={(e) => props.onFilterChange('sync', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'SYNCED', label: 'Sincronizado' },
            { value: 'PENDING', label: 'Pendente' },
            { value: 'ERROR', label: 'Com erro' },
          ]}
        />
        <SelectField
          label="Publicação"
          value={props.filters.publish}
          onChange={(e) => props.onFilterChange('publish', e.target.value)}
          options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'PUBLISHED', label: 'Publicado' },
            { value: 'NOT_PUBLISHED', label: 'Não publicado' },
          ]}
        />
        <div className={styles.filterActions}>
          <Button type="button" variant="secondary" onClick={props.onClearFilters}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          rows={props.products}
          rowKey={(row) => row.itemId}
          loading={props.productsLoading}
          onRowClick={(row) => props.onSelectProduct(row.itemId)}
          emptyTitle="Nenhum produto encontrado"
        />
      </div>
      <div className={styles.mobileCards}>
        {props.products.map((row) => (
          <article key={row.itemId} className={styles.mobileCard}>
            <strong>{row.commercialName}</strong>
            <span>
              {row.code}
              {row.sku ? ` / ${row.sku}` : ''}
            </span>
            <span>{statusBadge(row.integrationStatus)}</span>
            <span>
              {formatMoney(row.storePrice)} · Disp. {row.availableStock}
            </span>
            <span>Última sync: {formatDateTime(row.lastSyncedAt)}</span>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onSelectProduct(row.itemId)}
            >
              Configurar
            </button>
          </article>
        ))}
      </div>
      <Pagination
        page={props.page}
        pageSize={props.pageSize}
        total={props.total}
        totalPages={props.totalPages}
        onPageChange={props.onPageChange}
      />

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Histórico de sincronizações</h2>
          <p>Acompanhe execuções recentes deste canal.</p>
        </div>
        {props.syncJobs.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--fm-muted)', fontSize: 12 }}>
            Nenhuma sincronização realizada.
          </p>
        ) : (
          <div className={styles.desktopTable}>
            <Table
              columns={[
                {
                  id: 'id',
                  header: 'ID',
                  cell: (row) => `#${String(row.sequentialId).padStart(6, '0')}`,
                },
                {
                  id: 'type',
                  header: 'Tipo',
                  cell: (row) =>
                    [
                      row.syncProducts ? 'Produtos' : null,
                      row.syncStock ? 'Estoque' : null,
                      row.syncPrices ? 'Preços' : null,
                    ]
                      .filter(Boolean)
                      .join(', '),
                },
                {
                  id: 'started',
                  header: 'Início',
                  cell: (row) => formatDateTime(row.startedAt ?? row.createdAt),
                },
                {
                  id: 'end',
                  header: 'Fim',
                  cell: (row) => formatDateTime(row.completedAt),
                },
                {
                  id: 'user',
                  header: 'Usuário',
                  cell: (row) => row.userName ?? row.userEmail ?? '—',
                },
                {
                  id: 'processed',
                  header: 'Processados',
                  cell: (row) => row.productsProcessed,
                },
                {
                  id: 'ok',
                  header: 'Sucesso',
                  cell: (row) => row.productsSuccess,
                },
                {
                  id: 'err',
                  header: 'Erros',
                  cell: (row) => row.productsError,
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: (row) => SYNC_JOB_STATUS_LABELS[row.status] ?? row.status,
                },
              ]}
              rows={props.syncJobs}
              rowKey={(row) => row.id}
              emptyTitle="Nenhuma sincronização"
            />
          </div>
        )}
      </section>

      {props.selected || props.selectedLoading
        ? renderProductDialog(props)
        : null}
      {props.syncDialogOpen ? renderSyncDialog(props) : null}
      {props.configOpen ? renderConfigDialog(props) : null}
    </div>
  )
}

function renderConfigDialog(props: LojaOnlinePageProps) {
  return (
    <Dialog
      open
      title="Configurações da loja"
      onClose={props.onCloseConfig}
      footer={
        <>
          {props.overview?.connected ? (
            <Button type="button" variant="ghost" onClick={props.onDisconnect}>
              Desconectar
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={props.onCloseConfig}>
            Cancelar
          </Button>
          <Button type="button" loading={props.saving} onClick={props.onSaveConfig}>
            Salvar
          </Button>
        </>
      }
    >
      <div className={styles.formGrid}>
        <TextField
          label="Nome do canal"
          value={props.configName}
          onChange={(e) => props.onConfigNameChange(e.target.value)}
        />
        <TextField
          label="URL base (opcional)"
          value={props.configBaseUrl}
          onChange={(e) => props.onConfigBaseUrlChange(e.target.value)}
        />
        <TextField
          label="Credencial / token (opcional)"
          type="password"
          value={props.configCredentials}
          onChange={(e) => props.onConfigCredentialsChange(e.target.value)}
          hint="Armazenada apenas no backend (hash). Nunca é reexibida."
        />
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--fm-muted)' }}>
        Canal genérico multiplataforma. Não simula conexão com Shopify, VTEX ou similares —
        prepara o ERP para sincronizar listagens e estoque quando uma integração concreta for
        ligada.
      </p>
    </Dialog>
  )
}

function renderSyncDialog(props: LojaOnlinePageProps) {
  return (
    <Dialog
      open
      title="O que deseja sincronizar?"
      onClose={props.onCloseSync}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={props.onCloseSync}>
            Cancelar
          </Button>
          <Button type="button" loading={props.syncing} onClick={props.onConfirmSync}>
            Sincronizar
          </Button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Checkbox
          label="Produtos"
          checked={props.syncOptions.syncProducts}
          onChange={(e) => props.onSyncOptionChange('syncProducts', e.target.checked)}
        />
        <Checkbox
          label="Estoque"
          checked={props.syncOptions.syncStock}
          onChange={(e) => props.onSyncOptionChange('syncStock', e.target.checked)}
        />
        <Checkbox
          label="Preços"
          checked={props.syncOptions.syncPrices}
          onChange={(e) => props.onSyncOptionChange('syncPrices', e.target.checked)}
        />
      </div>
    </Dialog>
  )
}

function renderProductDialog(props: LojaOnlinePageProps) {
  const selected = props.selected
  return (
    <Dialog
      open
      title={selected ? selected.commercialName : 'Carregando…'}
      onClose={props.onCloseProduct}
      footer={
        selected ? (
          <>
            {props.canUnpublish && selected.publishStatus === 'PUBLISHED' ? (
              <Button type="button" variant="secondary" onClick={props.onUnpublish}>
                Despublicar
              </Button>
            ) : null}
            {props.canPublish && selected.publishStatus !== 'PUBLISHED' ? (
              <Button type="button" variant="secondary" onClick={props.onPublish}>
                Publicar na loja
              </Button>
            ) : null}
            {props.canConfigureProduct ? (
              <Button
                type="button"
                loading={props.saving}
                onClick={() =>
                  props.onSaveProduct({
                    commercialName: selected.commercialName,
                    shortDescription: selected.shortDescription,
                    storeDescription: selected.storeDescription,
                    storeCategory: selected.storeCategory,
                    tags: selected.tags,
                    useErpPrice: selected.useErpPrice,
                    priceOverride: selected.priceOverride,
                    promoPrice: selected.promoPrice,
                    promoStartsAt: selected.promoStartsAt,
                    promoEndsAt: selected.promoEndsAt,
                  })
                }
              >
                Salvar
              </Button>
            ) : null}
          </>
        ) : null
      }
    >
      {props.selectedLoading || !selected ? (
        <p style={{ margin: 0, color: 'var(--fm-muted)' }}>Carregando…</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div className={styles.sectionHeader}>
              <h2>Informações do produto (ERP)</h2>
            </div>
            <p style={{ margin: 0, fontSize: 12 }}>
              {selected.code} · {selected.sku ?? 'sem SKU'} ·{' '}
              {selected.categoryName ?? 'sem categoria'} ·{' '}
              {selected.brandName ?? 'sem marca'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 12 }}>
              <a href={`/app/estoque/itens/${selected.itemId}`}>Abrir cadastro F1</a>
            </p>
          </div>

          <div className={styles.formGrid}>
            <TextField
              label="Nome comercial"
              value={selected.commercialName}
              onChange={(e) =>
                props.onSelectedFieldChange('commercialName', e.target.value)
              }
            />
            <TextField
              label="Categoria da loja"
              value={selected.storeCategory ?? ''}
              onChange={(e) =>
                props.onSelectedFieldChange('storeCategory', e.target.value)
              }
            />
            <TextField
              label="Descrição curta"
              value={selected.shortDescription ?? ''}
              onChange={(e) =>
                props.onSelectedFieldChange('shortDescription', e.target.value)
              }
            />
            <TextField
              label="Tags"
              value={selected.tags ?? ''}
              onChange={(e) => props.onSelectedFieldChange('tags', e.target.value)}
            />
          </div>
          <TextField
            label="Descrição da loja"
            value={selected.storeDescription ?? ''}
            onChange={(e) =>
              props.onSelectedFieldChange('storeDescription', e.target.value)
            }
          />

          <div className={styles.sectionHeader}>
            <h2>Preço</h2>
            <p>
              {selected.useErpPrice
                ? 'Preço controlado pelo ERP (F1).'
                : 'Preço override da loja.'}
            </p>
          </div>
          <Checkbox
            label="Usar preço de venda do ERP"
            checked={selected.useErpPrice}
            onChange={(e) =>
              props.onSelectedFieldChange('useErpPrice', e.target.checked)
            }
          />
          <div className={styles.formGrid}>
            <TextField
              label="Preço ERP"
              value={formatMoney(selected.erpSalePrice)}
              disabled
            />
            <TextField
              label="Preço override"
              type="number"
              disabled={selected.useErpPrice || !props.canChangePrice}
              value={selected.priceOverride ?? ''}
              onChange={(e) =>
                props.onSelectedFieldChange(
                  'priceOverride',
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
            />
            <TextField
              label="Preço promocional"
              type="number"
              value={selected.promoPrice ?? ''}
              onChange={(e) =>
                props.onSelectedFieldChange(
                  'promoPrice',
                  e.target.value === '' ? null : Number(e.target.value),
                )
              }
            />
          </div>

          <div className={styles.sectionHeader}>
            <h2>Estoque</h2>
          </div>
          <div className={styles.stockFlow}>
            <div className={styles.stockFlowItem}>
              Estoque ERP
              <strong>{selected.stockFlow.erpPhysical}</strong>
            </div>
            <div className={styles.stockFlowItem}>
              Disponível para venda
              <strong>{selected.stockFlow.availableForSale}</strong>
            </div>
            <div className={styles.stockFlowItem}>
              Loja Online
              <strong>{selected.stockFlow.storePublished ?? '—'}</strong>
            </div>
          </div>
          {selected.stockFlow.pendingSync ? (
            <div className={styles.warnBox}>Estoque pendente de sincronização</div>
          ) : null}
          {selected.trackExpiry ? (
            <p style={{ margin: 0, fontSize: 11, color: 'var(--fm-muted)' }}>
              Disponibilidade respeita lotes não vencidos (regra do backend / F2).
            </p>
          ) : null}

          {selected.pendings.length > 0 ? (
            <div className={styles.warnBox}>
              <strong>Não é possível publicar este produto.</strong>
              <ul className={styles.pendingList}>
                {selected.pendings.map((p) => (
                  <li key={p.code + p.message}>
                    {p.message}{' '}
                    {p.fixPath ? <a href={p.fixPath}>Corrigir</a> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {selected.errorMessage ? (
            <div className={styles.errorBanner} role="alert">
              Motivo: {selected.errorMessage}
            </div>
          ) : null}
        </div>
      )}
    </Dialog>
  )
}
