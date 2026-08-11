import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Checkbox } from '../../../shared/ui/Checkbox'
import { Pagination } from '../../../shared/ui/Pagination'
import { SelectField } from '../../../shared/ui/SelectField'
import { Table, type TableColumn } from '../../../shared/ui/Table'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import type { ExportLookups } from '../infrastructure/exportacao.api'
import type {
  ExportDraftFilters,
  ExportFormat,
  ExportJob,
  ExportMeta,
  ExportPreview,
  ExportType,
  ExportTypeMeta,
} from '../domain/export.schema'
import {
  FORMAT_LABELS,
  STATUS_LABELS,
  TYPE_LABELS,
} from '../domain/export.schema'
import styles from './ExportacaoPage.module.css'

export type ExportacaoPageProps = {
  meta: ExportMeta | null
  lookups: ExportLookups | null
  draft: {
    type: ExportType
    format: ExportFormat
    filters: ExportDraftFilters
    columns: string[]
    sortBy: string
    sortDir: 'asc' | 'desc'
    fileName: string
  }
  typeMeta: ExportTypeMeta | null
  preview: ExportPreview | null
  previewLoading: boolean
  creating: boolean
  history: ExportJob[]
  historyTotal: number
  historyPage: number
  historyPageSize: number
  historyTotalPages: number
  historyLoading: boolean
  activeJob: ExportJob | null
  error: string | null
  canCreate: boolean
  canDownload: boolean
  canCancel: boolean
  onRefreshHistory: () => void
  onTypeChange: (type: ExportType) => void
  onFormatChange: (format: ExportFormat) => void
  onFilterChange: (key: string, value: string | boolean | number | '') => void
  onToggleColumn: (id: string) => void
  onSelectAllColumns: () => void
  onClearColumns: () => void
  onSortByChange: (sortBy: string) => void
  onSortDirChange: (sortDir: 'asc' | 'desc') => void
  onFileNameChange: (value: string) => void
  onGenerate: () => void
  onHistoryPageChange: (page: number) => void
  onDownload: (job: ExportJob) => void
  onRefreshJob: (job: ExportJob) => void
  onCancelJob: (job: ExportJob) => void
  onRetryJob: (job: ExportJob) => void
  onReuseConfig: (job: ExportJob) => void
}

function statusBadge(status: ExportJob['status']) {
  const label = STATUS_LABELS[status]
  if (status === 'COMPLETED') return <Badge variant="success">{label}</Badge>
  if (status === 'FAILED' || status === 'EXPIRED') {
    return <Badge variant="danger">{label}</Badge>
  }
  if (status === 'PROCESSING' || status === 'PENDING') {
    return <Badge variant="warn">{label}</Badge>
  }
  return <Badge variant="neutral">{label}</Badge>
}

function formatBytes(size: number | null): string {
  if (size == null) return '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function formatDateTime(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR')
}

function describeFilters(
  filters: ExportDraftFilters,
  lookups: ExportLookups | null,
): string {
  const parts: string[] = []
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value == null || value === false) return
    if (key === 'categoryId') {
      const name = lookups?.categories.find((c) => c.id === value)?.label
      parts.push(`Categoria: ${name ?? value}`)
      return
    }
    if (key === 'brandId') {
      const name = lookups?.brands.find((b) => b.id === value)?.label
      parts.push(`Marca: ${name ?? value}`)
      return
    }
    if (key === 'locationId') {
      const name = lookups?.locations.find((l) => l.id === value)?.label
      parts.push(`Localização: ${name ?? value}`)
      return
    }
    if (key === 'measureUnitId') {
      const name = lookups?.units.find((u) => u.id === value)?.code ?? lookups?.units.find((u) => u.id === value)?.label
      parts.push(`Unidade: ${name ?? value}`)
      return
    }
    if (key === 'status') {
      parts.push(
        `Status: ${value === 'ACTIVE' ? 'Ativo' : value === 'INACTIVE' ? 'Inativo' : String(value)}`,
      )
      return
    }
    if (key === 'onlyWithQuantity' && value === true) {
      parts.push('Somente com estoque disponível')
      return
    }
    parts.push(`${key}: ${String(value)}`)
  })
  return parts.length ? parts.join(' · ') : 'Nenhum filtro adicional'
}

export function ExportacaoPage(props: ExportacaoPageProps) {
  const {
    meta,
    lookups,
    draft,
    typeMeta,
    preview,
    previewLoading,
    creating,
    history,
    historyTotal,
    historyPage,
    historyPageSize,
    historyTotalPages,
    historyLoading,
    activeJob,
    error,
    canCreate,
  } = props

  const columnGroups = (() => {
    if (!typeMeta) {
      return [] as Array<{ group: string; columns: ExportTypeMeta['columns'] }>
    }
    const map = new Map<string, ExportTypeMeta['columns']>()
    typeMeta.columns.forEach((col) => {
      const list = map.get(col.group) ?? []
      list.push(col)
      map.set(col.group, list)
    })
    return Array.from(map.entries()).map(([group, columns]) => ({
      group,
      columns,
    }))
  })()

  const historyColumns: TableColumn<ExportJob>[] = [
    {
      id: 'id',
      header: 'ID',
      cell: (row) => `#${String(row.sequentialId).padStart(6, '0')}`,
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (row) => TYPE_LABELS[row.type],
    },
    {
      id: 'format',
      header: 'Formato',
      cell: (row) => row.format,
    },
    {
      id: 'user',
      header: 'Usuário',
      cell: (row) => row.userName ?? row.userEmail ?? '—',
    },
    {
      id: 'createdAt',
      header: 'Data/hora',
      cell: (row) => formatDateTime(row.createdAt),
    },
    {
      id: 'records',
      header: 'Registros',
      align: 'right',
      cell: (row) => row.recordCount ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => statusBadge(row.status),
    },
    {
      id: 'size',
      header: 'Tamanho',
      cell: (row) => formatBytes(row.fileSizeBytes),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) => (
        <div className={styles.historyActions}>
          {row.canDownload && props.canDownload ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onDownload(row)}
            >
              Baixar
            </button>
          ) : null}
          {row.status === 'PROCESSING' || row.status === 'PENDING' ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onRefreshJob(row)}
            >
              Atualizar status
            </button>
          ) : null}
          {row.canCancel && props.canCancel ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onCancelJob(row)}
            >
              Cancelar
            </button>
          ) : null}
          {row.canRetry ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onRetryJob(row)}
            >
              {row.status === 'EXPIRED' ? 'Gerar novamente' : 'Tentar novamente'}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => props.onReuseConfig(row)}
          >
            Usar configurações
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
          { label: 'F3 — Exportação de Arquivos' },
        ]}
        title="Exportação de Arquivos"
        description="Exporte dados do estoque para análise, integração ou utilização externa."
        actions={
          <Button type="button" variant="secondary" onClick={props.onRefreshHistory}>
            Atualizar histórico
          </Button>
        }
      />

      {error ? (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      ) : null}

      {activeJob ? (
        <section className={styles.activeJob} aria-live="polite">
          <div className={styles.activeJobTitle}>
            Exportação #{String(activeJob.sequentialId).padStart(6, '0')}
          </div>
          <div className={styles.activeJobMeta}>
            {TYPE_LABELS[activeJob.type]} · {FORMAT_LABELS[activeJob.format]}
          </div>
          {activeJob.status === 'PROCESSING' || activeJob.status === 'PENDING' ? (
            <div>Processando exportação…</div>
          ) : null}
          {activeJob.status === 'COMPLETED' ? (
            <>
              <div>✓ Arquivo pronto</div>
              <div className={styles.activeJobMeta}>
                {activeJob.recordCount ?? 0} registros · Gerado em{' '}
                {formatDateTime(activeJob.completedAt)}
                {activeJob.expiresAt
                  ? ` · Disponível até ${formatDateTime(activeJob.expiresAt)}`
                  : null}
              </div>
            </>
          ) : null}
          {activeJob.status === 'FAILED' ? (
            <div>{activeJob.errorMessage ?? 'Falha ao gerar o arquivo.'}</div>
          ) : null}
          <div className={styles.activeJobActions}>
            {activeJob.canDownload && props.canDownload ? (
              <Button type="button" onClick={() => props.onDownload(activeJob)}>
                Baixar arquivo
              </Button>
            ) : null}
            {activeJob.canCancel && props.canCancel ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => props.onCancelJob(activeJob)}
              >
                Cancelar exportação
              </Button>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Nova exportação</h2>
          <p>Selecione os dados e as opções para gerar seu arquivo.</p>
        </div>

        <div>
          <div className={styles.sectionHeader}>
            <h2>O que deseja exportar?</h2>
          </div>
          <div className={styles.typeCards} role="radiogroup" aria-label="Tipo de exportação">
            {(meta?.types ?? []).map((type) => {
              const active = draft.type === type.type
              return (
                <button
                  key={type.type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  className={`${styles.typeCard} ${active ? styles.typeCardActive : ''}`}
                  onClick={() => props.onTypeChange(type.type)}
                >
                  <strong>{type.label}</strong>
                  <span>{type.description}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.grid2}>
          <SelectField
            label="Formato"
            value={draft.format}
            onChange={(e) =>
              props.onFormatChange(e.target.value as ExportFormat)
            }
            options={(typeMeta?.formats ?? ['XLSX']).map((format) => ({
              value: format,
              label: FORMAT_LABELS[format],
            }))}
          />
          <TextField
            label="Nome do arquivo"
            value={draft.fileName}
            placeholder="Deixe em branco para gerar automaticamente"
            onChange={(e) => props.onFileNameChange(e.target.value)}
          />
        </div>

        <div>
          <div className={styles.sectionHeader}>
            <h2>Filtros</h2>
            <p>Filtros específicos do tipo selecionado.</p>
          </div>
          <div className={styles.filters}>
            {renderFilters(draft.type, draft.filters, lookups, props.onFilterChange)}
          </div>
        </div>

        <div>
          <div className={styles.sectionHeader}>
            <h2>Colunas da exportação</h2>
          </div>
          <div className={styles.columnActions}>
            <Button type="button" variant="ghost" onClick={props.onSelectAllColumns}>
              Selecionar todos
            </Button>
            <Button type="button" variant="ghost" onClick={props.onClearColumns}>
              Desmarcar todos
            </Button>
          </div>
          <div className={styles.columnGroups}>
            {columnGroups.map((group) => (
              <div key={group.group} className={styles.columnGroup}>
                <h3>{group.group}</h3>
                <div className={styles.columnList}>
                  {group.columns.map((col) => (
                    <Checkbox
                      key={col.id}
                      label={col.label}
                      checked={draft.columns.includes(col.id)}
                      onChange={() => props.onToggleColumn(col.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.grid2}>
          <SelectField
            label="Ordenar por"
            value={draft.sortBy}
            onChange={(e) => props.onSortByChange(e.target.value)}
            options={(typeMeta?.sortOptions ?? []).map((opt) => ({
              value: opt.id,
              label: opt.label,
            }))}
          />
          <SelectField
            label="Ordem"
            value={draft.sortDir}
            onChange={(e) =>
              props.onSortDirChange(e.target.value as 'asc' | 'desc')
            }
            options={[
              { value: 'asc', label: 'Ordem crescente' },
              { value: 'desc', label: 'Ordem decrescente' },
            ]}
          />
        </div>

        <div className={styles.summaryLayout}>
          <div className={styles.summaryBox}>
            <div className={styles.sectionHeader}>
              <h2>Resumo da exportação</h2>
            </div>
            <dl>
              <dt>Tipo</dt>
              <dd>{typeMeta?.label ?? '—'}</dd>
              <dt>Formato</dt>
              <dd>{FORMAT_LABELS[draft.format]}</dd>
              <dt>Registros</dt>
              <dd>
                {previewLoading
                  ? 'Calculando…'
                  : preview
                    ? preview.count.toLocaleString('pt-BR')
                    : '—'}
              </dd>
              <dt>Filtros</dt>
              <dd>{describeFilters(draft.filters, lookups)}</dd>
              <dt>Colunas</dt>
              <dd>{draft.columns.length} selecionadas</dd>
            </dl>
            {meta ? (
              <p className={styles.retentionNote}>
                Arquivos ficam disponíveis por {meta.limits.retentionDays} dias após a
                geração.
                {preview?.willProcessAsync
                  ? ' Esta exportação será processada em segundo plano.'
                  : null}
              </p>
            ) : null}
          </div>
          {canCreate ? (
            <Button
              type="button"
              onClick={props.onGenerate}
              loading={creating}
              disabled={creating || !draft.columns.length}
            >
              Gerar arquivo
            </Button>
          ) : null}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Histórico de exportações</h2>
          <p>Consulte, baixe ou reutilize configurações anteriores.</p>
        </div>

        {!historyLoading && history.length === 0 ? (
          <div className={styles.empty}>
            <strong>Nenhuma exportação realizada</strong>
            As exportações geradas por você aparecerão aqui.
          </div>
        ) : (
          <>
            <div className={styles.desktopTable}>
              <Table
                columns={historyColumns}
                rows={history}
                rowKey={(row) => row.id}
                loading={historyLoading}
                emptyTitle="Nenhuma exportação realizada"
              />
            </div>
            <div className={styles.mobileCards}>
              {history.map((row) => (
                <article key={row.id} className={styles.mobileCard}>
                  <strong>
                    #{String(row.sequentialId).padStart(6, '0')} · {TYPE_LABELS[row.type]}
                  </strong>
                  <span>
                    {FORMAT_LABELS[row.format]} · {formatDateTime(row.createdAt)}
                  </span>
                  <span>{statusBadge(row.status)}</span>
                  <span>
                    {row.recordCount ?? '—'} registros · {formatBytes(row.fileSizeBytes)}
                  </span>
                  {row.expiresAt ? (
                    <span className={styles.retentionNote}>
                      Disponível até {formatDateTime(row.expiresAt)}
                    </span>
                  ) : null}
                  <div className={styles.historyActions}>
                    {row.canDownload && props.canDownload ? (
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => props.onDownload(row)}
                      >
                        Baixar
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => props.onReuseConfig(row)}
                    >
                      Usar configurações
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <Pagination
              page={historyPage}
              pageSize={historyPageSize}
              total={historyTotal}
              totalPages={historyTotalPages}
              onPageChange={props.onHistoryPageChange}
            />
          </>
        )}
      </section>
    </div>
  )
}

function renderFilters(
  type: ExportType,
  filters: ExportDraftFilters,
  lookups: ExportLookups | null,
  onFilterChange: ExportacaoPageProps['onFilterChange'],
) {
  if (type === 'ITEMS') {
    return (
      <>
        <TextField
          label="Código"
          value={String(filters.code ?? '')}
          onChange={(e) => onFilterChange('code', e.target.value)}
        />
        <TextField
          label="Descrição"
          value={String(filters.description ?? '')}
          onChange={(e) => onFilterChange('description', e.target.value)}
        />
        <TextField
          label="SKU"
          value={String(filters.sku ?? '')}
          onChange={(e) => onFilterChange('sku', e.target.value)}
        />
        <TextField
          label="Código de barras"
          value={String(filters.barcode ?? '')}
          onChange={(e) => onFilterChange('barcode', e.target.value)}
        />
        <SelectField
          label="Categoria"
          value={String(filters.categoryId ?? '')}
          onChange={(e) => onFilterChange('categoryId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.categories ?? []).map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />
        <SelectField
          label="Marca"
          value={String(filters.brandId ?? '')}
          onChange={(e) => onFilterChange('brandId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.brands ?? []).map((b) => ({
            value: b.id,
            label: b.label,
          }))}
        />
        <SelectField
          label="Status"
          value={String(filters.status ?? '')}
          onChange={(e) => onFilterChange('status', e.target.value)}
          placeholder="Todos"
          options={[
            { value: 'ACTIVE', label: 'Ativo' },
            { value: 'INACTIVE', label: 'Inativo' },
          ]}
        />
        <SelectField
          label="Unidade"
          value={String(filters.measureUnitId ?? '')}
          onChange={(e) => onFilterChange('measureUnitId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.units ?? []).map((u) => ({
            value: u.id,
            label: u.code ?? u.label,
          }))}
        />
        <SelectField
          label="Localização"
          value={String(filters.locationId ?? '')}
          onChange={(e) => onFilterChange('locationId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.locations ?? []).map((l) => ({
            value: l.id,
            label: l.label,
          }))}
        />
      </>
    )
  }

  if (type === 'LOTS_EXPIRY') {
    return (
      <>
        <TextField
          label="Item"
          value={String(filters.search ?? '')}
          onChange={(e) => onFilterChange('search', e.target.value)}
          placeholder="Código ou descrição"
        />
        <SelectField
          label="Categoria"
          value={String(filters.categoryId ?? '')}
          onChange={(e) => onFilterChange('categoryId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.categories ?? []).map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />
        <TextField
          label="Lote"
          value={String(filters.lotNumber ?? '')}
          onChange={(e) => onFilterChange('lotNumber', e.target.value)}
        />
        <SelectField
          label="Status de validade"
          value={String(filters.status ?? '')}
          onChange={(e) => onFilterChange('status', e.target.value)}
          placeholder="Todos"
          options={[
            { value: 'ATTENTION', label: 'Em atenção' },
            { value: 'EXPIRED', label: 'Vencido' },
            { value: 'EXPIRES_TODAY', label: 'Vence hoje' },
            { value: 'EXPIRES_IN_7', label: 'Até 7 dias' },
            { value: 'EXPIRES_IN_15', label: 'Até 15 dias' },
            { value: 'EXPIRES_IN_30', label: 'Até 30 dias' },
            { value: 'REGULAR', label: 'Regular' },
            { value: 'ALL', label: 'Todos' },
          ]}
        />
        <TextField
          label="Validade inicial"
          type="date"
          value={String(filters.expiryFrom ?? '')}
          onChange={(e) => onFilterChange('expiryFrom', e.target.value)}
        />
        <TextField
          label="Validade final"
          type="date"
          value={String(filters.expiryTo ?? '')}
          onChange={(e) => onFilterChange('expiryTo', e.target.value)}
        />
        <SelectField
          label="Localização"
          value={String(filters.locationId ?? '')}
          onChange={(e) => onFilterChange('locationId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.locations ?? []).map((l) => ({
            value: l.id,
            label: l.label,
          }))}
        />
        <Checkbox
          label="Somente com estoque disponível"
          checked={Boolean(filters.onlyWithQuantity)}
          onChange={(e) => onFilterChange('onlyWithQuantity', e.target.checked)}
        />
      </>
    )
  }

  if (type === 'CURRENT_STOCK') {
    return (
      <>
        <TextField
          label="Item"
          value={String(filters.search ?? '')}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
        <SelectField
          label="Categoria"
          value={String(filters.categoryId ?? '')}
          onChange={(e) => onFilterChange('categoryId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.categories ?? []).map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />
        <SelectField
          label="Localização"
          value={String(filters.locationId ?? '')}
          onChange={(e) => onFilterChange('locationId', e.target.value)}
          placeholder="Todas"
          options={(lookups?.locations ?? []).map((l) => ({
            value: l.id,
            label: l.label,
          }))}
        />
        <SelectField
          label="Status"
          value={String(filters.status ?? '')}
          onChange={(e) => onFilterChange('status', e.target.value)}
          placeholder="Todos"
          options={[
            { value: 'ACTIVE', label: 'Ativo' },
            { value: 'INACTIVE', label: 'Inativo' },
          ]}
        />
        <TextField
          label="Qtd. mínima"
          type="number"
          value={String(filters.qtyMin ?? '')}
          onChange={(e) =>
            onFilterChange(
              'qtyMin',
              e.target.value === '' ? '' : Number(e.target.value),
            )
          }
        />
        <TextField
          label="Qtd. máxima"
          type="number"
          value={String(filters.qtyMax ?? '')}
          onChange={(e) =>
            onFilterChange(
              'qtyMax',
              e.target.value === '' ? '' : Number(e.target.value),
            )
          }
        />
      </>
    )
  }

  if (type === 'ONLINE_STORE') {
    return (
      <>
        <TextField
          label="Buscar"
          value={String(filters.search ?? '')}
          onChange={(e) => onFilterChange('search', e.target.value)}
        />
        <SelectField
          label="Status"
          value={String(filters.status ?? '')}
          onChange={(e) => onFilterChange('status', e.target.value)}
          placeholder="Todos"
          options={[
            { value: 'PUBLISHED', label: 'Publicado' },
            { value: 'NOT_PUBLISHED', label: 'Não publicado' },
            { value: 'PENDING', label: 'Pendente' },
            { value: 'ERROR', label: 'Com erro' },
            { value: 'UNAVAILABLE', label: 'Indisponível' },
          ]}
        />
        <SelectField
          label="Publicação"
          value={String(filters.publish ?? '')}
          onChange={(e) => onFilterChange('publish', e.target.value)}
          placeholder="Todas"
          options={[
            { value: 'PUBLISHED', label: 'Publicado' },
            { value: 'NOT_PUBLISHED', label: 'Não publicado' },
          ]}
        />
        <SelectField
          label="Sincronização"
          value={String(filters.sync ?? '')}
          onChange={(e) => onFilterChange('sync', e.target.value)}
          placeholder="Todas"
          options={[
            { value: 'SYNCED', label: 'Sincronizado' },
            { value: 'PENDING', label: 'Pendente' },
            { value: 'ERROR', label: 'Com erro' },
          ]}
        />
      </>
    )
  }

  return (
    <>
      <TextField
        label="Nome"
        value={String(filters.search ?? '')}
        onChange={(e) => onFilterChange('search', e.target.value)}
      />
      <SelectField
        label="Situação"
        value={
          filters.active === true
            ? 'true'
            : filters.active === false
              ? 'false'
              : ''
        }
        onChange={(e) => {
          if (e.target.value === '') onFilterChange('active', '')
          else onFilterChange('active', e.target.value === 'true')
        }}
        placeholder="Todas"
        options={[
          { value: 'true', label: 'Ativas' },
          { value: 'false', label: 'Inativas' },
        ]}
      />
    </>
  )
}
