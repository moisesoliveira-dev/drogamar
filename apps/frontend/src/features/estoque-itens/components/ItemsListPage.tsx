import { Button } from '../../../shared/ui/Button'
import { Badge } from '../../../shared/ui/Badge'
import { Dialog } from '../../../shared/ui/Dialog'
import { Pagination } from '../../../shared/ui/Pagination'
import { SelectField } from '../../../shared/ui/SelectField'
import { Table, type TableColumn } from '../../../shared/ui/Table'
import { TextField } from '../../../shared/ui/TextField'
import { SearchIcon } from '../../../shared/ui/icons'
import { PageHeader } from '../../app-shell'
import type { StockItem, StockLookups } from '../domain/item.schema'
import styles from './ItemsListPage.module.css'

export type ItemsListPageProps = {
  items: StockItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  loading: boolean
  error: string | null
  lookups: StockLookups | null
  filters: {
    search: string
    status: string
    categoryId: string
    brandId: string
    locationId: string
    measureUnitId: string
    itemType: string
    sortBy: string
    sortDir: 'asc' | 'desc'
  }
  selectedId: string | null
  deleteTarget: StockItem | null
  deleting?: boolean
  canCreate: boolean
  canEdit: boolean
  canDeactivate: boolean
  canDelete: boolean
  canExport: boolean
  onSearchChange: (value: string) => void
  onFilterChange: (key: string, value: string) => void
  onClearFilters: () => void
  onSortChange: (sortBy: string) => void
  onPageChange: (page: number) => void
  onSelect: (item: StockItem) => void
  onCreate: () => void
  onExport: () => void
  onView: (item: StockItem) => void
  onEdit: (item: StockItem) => void
  onDuplicate: (item: StockItem) => void
  onToggleActive: (item: StockItem) => void
  onAskDelete: (item: StockItem) => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}

function statusBadge(status: string) {
  return status === 'ACTIVE' ? (
    <Badge variant="success">Ativo</Badge>
  ) : (
    <Badge variant="neutral">Inativo</Badge>
  )
}

export function ItemsListPage(props: ItemsListPageProps) {
  const {
    items,
    total,
    page,
    pageSize,
    totalPages,
    loading,
    error,
    lookups,
    filters,
    selectedId,
    deleteTarget,
    deleting,
    canCreate,
    canEdit,
    canDeactivate,
    canDelete,
    canExport,
  } = props

  const columns: TableColumn<StockItem>[] = [
    {
      id: 'code',
      header: 'Código',
      sortable: true,
      cell: (row) => row.code,
    },
    {
      id: 'description',
      header: 'Descrição',
      sortable: true,
      cell: (row) => row.description,
    },
    {
      id: 'sku',
      header: 'SKU',
      sortable: true,
      cell: (row) => row.sku ?? '—',
    },
    {
      id: 'barcode',
      header: 'Cód. barras',
      cell: (row) => row.barcode ?? '—',
    },
    {
      id: 'category',
      header: 'Categoria',
      cell: (row) => row.categoryName ?? '—',
    },
    {
      id: 'unit',
      header: 'Unidade',
      cell: (row) => row.measureUnitCode ?? '—',
    },
    {
      id: 'currentStock',
      header: 'Estoque',
      sortable: true,
      align: 'right',
      cell: (row) => (row.trackStock ? row.currentStock : '—'),
    },
    {
      id: 'minStock',
      header: 'Mín.',
      sortable: true,
      align: 'right',
      cell: (row) => row.minStock ?? '—',
    },
    {
      id: 'status',
      header: 'Status',
      sortable: true,
      cell: (row) => statusBadge(row.status),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) => (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => props.onView(row)}
          >
            Ver
          </button>
          {canEdit ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onEdit(row)}
            >
              Editar
            </button>
          ) : null}
          {canEdit ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onDuplicate(row)}
            >
              Duplicar
            </button>
          ) : null}
          {canDeactivate ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onToggleActive(row)}
            >
              {row.status === 'ACTIVE' ? 'Desativar' : 'Ativar'}
            </button>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.danger}`}
              onClick={() => props.onAskDelete(row)}
            >
              Excluir
            </button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumbs={[
          { label: 'Estoque', path: '/app/estoque/itens' },
          { label: 'F1 — Cadastro de Itens' },
        ]}
        title="Cadastro de Itens"
        description="Cadastre e gerencie os itens utilizados no estoque."
        actions={
          <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap' }}>
            {canExport ? (
              <Button type="button" variant="secondary" onClick={props.onExport}>
                Exportar
              </Button>
            ) : null}
            {canCreate ? (
              <Button type="button" onClick={props.onCreate}>
                + Novo item
              </Button>
            ) : null}
          </div>
        }
      />

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <TextField
            label="Buscar"
            placeholder="Buscar item..."
            value={filters.search}
            onChange={(e) => props.onSearchChange(e.target.value)}
            leadingIcon={<SearchIcon size={16} />}
          />
        </div>
      </div>

      <div className={styles.filters}>
        <SelectField
          label="Status"
          value={filters.status}
          onChange={(e) => props.onFilterChange('status', e.target.value)}
          options={[
            { value: 'ACTIVE', label: 'Ativo' },
            { value: 'INACTIVE', label: 'Inativo' },
          ]}
        />
        <SelectField
          label="Categoria"
          value={filters.categoryId}
          onChange={(e) => props.onFilterChange('categoryId', e.target.value)}
          options={(lookups?.categories ?? []).map((c) => ({
            value: c.id,
            label: c.label,
          }))}
        />
        <SelectField
          label="Unidade"
          value={filters.measureUnitId}
          onChange={(e) =>
            props.onFilterChange('measureUnitId', e.target.value)
          }
          options={(lookups?.units ?? []).map((u) => ({
            value: u.id,
            label: u.label,
          }))}
        />
        <SelectField
          label="Localização"
          value={filters.locationId}
          onChange={(e) => props.onFilterChange('locationId', e.target.value)}
          options={(lookups?.locations ?? []).map((l) => ({
            value: l.id,
            label: l.label,
          }))}
        />
        <SelectField
          label="Marca"
          value={filters.brandId}
          onChange={(e) => props.onFilterChange('brandId', e.target.value)}
          options={(lookups?.brands ?? []).map((b) => ({
            value: b.id,
            label: b.label,
          }))}
        />
        <SelectField
          label="Tipo"
          value={filters.itemType}
          onChange={(e) => props.onFilterChange('itemType', e.target.value)}
          options={(lookups?.itemTypes ?? []).map((t) => ({
            value: t.id,
            label: t.label,
          }))}
        />
        <div className={styles.filterActions}>
          <Button type="button" variant="ghost" onClick={props.onClearFilters}>
            Limpar filtros
          </Button>
        </div>
      </div>

      <Table
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        sortBy={filters.sortBy}
        sortDir={filters.sortDir}
        onSortChange={props.onSortChange}
        selectedKey={selectedId}
        onRowClick={props.onSelect}
        emptyTitle="Nenhum item cadastrado"
        emptyDescription="Clique em “+ Novo item” para começar."
      />

      {!loading && !error ? (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={props.onPageChange}
        />
      ) : null}

      <Dialog
        open={Boolean(deleteTarget)}
        title="Excluir item?"
        description={
          deleteTarget
            ? `Esta ação remove permanentemente “${deleteTarget.description}” (${deleteTarget.code}).`
            : undefined
        }
        onClose={props.onCancelDelete}
        footer={
          <>
            <Button
              type="button"
              variant="ghost"
              onClick={props.onCancelDelete}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              loading={deleting}
              onClick={props.onConfirmDelete}
            >
              Excluir
            </Button>
          </>
        }
      />
    </div>
  )
}
