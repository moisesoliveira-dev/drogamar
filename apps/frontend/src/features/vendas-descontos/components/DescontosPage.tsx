import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Dialog } from '../../../shared/ui/Dialog'
import { MetricCard } from '../../../shared/ui/MetricCard'
import { SelectField } from '../../../shared/ui/SelectField'
import { Table, type TableColumn } from '../../../shared/ui/Table'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import type { ProductSearchItem } from '../../vendas-carrinho'
import {
  formatPeriod,
  scopeLabel,
  statusLabel,
  statusVariant,
  typeLabel,
  type PromotionDashboard,
  type PromotionDetail,
  type PromotionFormValues,
  type PromotionListItem,
  type PromotionLookups,
  type SimulateResult,
} from '../domain/promocao.schema'
import styles from './DescontosPage.module.css'

export type DescontosPageProps = {
  dashboard: PromotionDashboard | null
  items: PromotionListItem[]
  loading: boolean
  busy: boolean
  error: string | null
  search: string
  status: string
  filtersOpen: boolean
  formOpen: boolean
  form: PromotionFormValues
  formErrors: Partial<Record<keyof PromotionFormValues, string>>
  editingId: string | null
  detail: PromotionDetail | null
  lookups: PromotionLookups | null
  products: ProductSearchItem[]
  productSearch: string
  productsLoading: boolean
  simulateOpen: boolean
  simulateProductSearch: string
  simulateProducts: ProductSearchItem[]
  simulateProductId: string
  simulateQty: string
  simulateResult: SimulateResult | null
  canCreate: boolean
  canEdit: boolean
  canActivate: boolean
  canPause: boolean
  canCancel: boolean
  canDelete: boolean
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  onOpenFilters: () => void
  onCloseFilters: () => void
  onOpenCreate: () => void
  onOpenEdit: (id: string) => void
  onCloseForm: () => void
  onFormChange: (patch: Partial<PromotionFormValues>) => void
  onToggleTarget: (id: string) => void
  onProductSearchChange: (value: string) => void
  onSave: () => void
  onActivate: (id: string) => void
  onPause: (id: string) => void
  onCancelPromo: (id: string) => void
  onDelete: (id: string) => void
  onOpenSimulate: () => void
  onCloseSimulate: () => void
  onSimulateProductSearchChange: (value: string) => void
  onSimulateProductIdChange: (id: string) => void
  onSimulateQtyChange: (value: string) => void
  onSimulate: () => void
}

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'SCHEDULED', label: 'Agendada' },
  { value: 'ACTIVE', label: 'Ativa' },
  { value: 'PAUSED', label: 'Pausada' },
  { value: 'EXPIRED', label: 'Expirada' },
  { value: 'CANCELLED', label: 'Cancelada' },
]

function Filters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: Pick<
  DescontosPageProps,
  'search' | 'status' | 'onSearchChange' | 'onStatusChange'
>) {
  return (
    <div className={styles.filters}>
      <TextField
        label="Buscar"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Nome da promoção"
      />
      <SelectField
        label="Status"
        value={status}
        onChange={(e) => onStatusChange(e.target.value)}
        options={STATUS_OPTIONS}
        emptyLabel="Todos"
      />
    </div>
  )
}

export function DescontosPage(props: DescontosPageProps) {
  const columns: TableColumn<PromotionListItem>[] = [
    {
      id: 'name',
      header: 'Nome',
      cell: (row) => <strong>{row.name}</strong>,
    },
    {
      id: 'type',
      header: 'Tipo',
      cell: (row) => typeLabel(row.type),
    },
    {
      id: 'period',
      header: 'Período',
      cell: (row) => formatPeriod(row.startsAt, row.endsAt),
    },
    {
      id: 'scope',
      header: 'Abrangência',
      cell: (row) => scopeLabel(row.scope),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (row) => (
        <Badge variant={statusVariant(row.derivedStatus)}>
          {statusLabel(row.derivedStatus)}
        </Badge>
      ),
    },
    {
      id: 'priority',
      header: 'Prioridade',
      cell: (row) => row.priority,
    },
    {
      id: 'products',
      header: 'Produtos',
      cell: (row) =>
        row.scope === 'ALL' ? 'Todos' : String(row.productCount),
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) => (
        <div className={styles.actions}>
          {props.canEdit ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onOpenEdit(row.id)}
            >
              Editar
            </button>
          ) : null}
          {props.canActivate &&
          (row.derivedStatus === 'DRAFT' ||
            row.derivedStatus === 'PAUSED') ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onActivate(row.id)}
            >
              Ativar
            </button>
          ) : null}
          {props.canPause && row.derivedStatus === 'ACTIVE' ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onPause(row.id)}
            >
              Pausar
            </button>
          ) : null}
          {props.canCancel &&
          row.derivedStatus !== 'CANCELLED' &&
          row.derivedStatus !== 'EXPIRED' ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onCancelPromo(row.id)}
            >
              Cancelar
            </button>
          ) : null}
          {props.canDelete && row.derivedStatus === 'DRAFT' ? (
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => props.onDelete(row.id)}
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
          { label: 'Vendas', path: '/app/vendas/carrinho' },
          { label: 'F6 — Descontos e Promoções' },
        ]}
        title="Descontos e Promoções"
        description="Regras comerciais calculadas e validadas pelo servidor."
        actions={
          <>
            <Button
              variant="secondary"
              disabled={props.busy}
              onClick={props.onOpenSimulate}
            >
              Simular promoção
            </Button>
            {props.canCreate ? (
              <Button disabled={props.busy} onClick={props.onOpenCreate}>
                + Nova promoção
              </Button>
            ) : null}
          </>
        }
      />

      {props.error ? <Alert variant="danger">{props.error}</Alert> : null}

      <section className={styles.metrics} aria-label="Indicadores">
        <MetricCard
          label="Promoções ativas"
          value={props.dashboard?.active ?? '—'}
          loading={!props.dashboard && props.loading}
          tone="success"
        />
        <MetricCard
          label="Agendadas"
          value={props.dashboard?.scheduled ?? '—'}
          loading={!props.dashboard && props.loading}
          tone="info"
        />
        <MetricCard
          label="Expirando"
          value={props.dashboard?.expiring ?? '—'}
          loading={!props.dashboard && props.loading}
          tone="warn"
        />
        <MetricCard
          label="Expiradas"
          value={props.dashboard?.expired ?? '—'}
          loading={!props.dashboard && props.loading}
        />
        <MetricCard
          label="Produtos promocionais"
          value={props.dashboard?.promotionalProducts ?? '—'}
          loading={!props.dashboard && props.loading}
        />
      </section>

      <div className={styles.desktopFilters}>
        <Filters
          search={props.search}
          status={props.status}
          onSearchChange={props.onSearchChange}
          onStatusChange={props.onStatusChange}
        />
      </div>
      <div className={styles.mobileFilterBar}>
        <Button variant="secondary" onClick={props.onOpenFilters}>
          Filtros
        </Button>
      </div>

      <div className={styles.desktopTable}>
        <Table
          columns={columns}
          rows={props.items}
          rowKey={(row) => row.id}
          loading={props.loading}
          emptyTitle="Nenhuma promoção cadastrada"
          emptyDescription="Crie uma promoção para aplicar descontos reais no caixa."
        />
      </div>

      <div className={styles.mobileList}>
        {props.loading ? (
          <p className={styles.muted}>Carregando…</p>
        ) : props.items.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Nenhuma promoção cadastrada</h2>
            <p>Crie uma promoção para aplicar descontos reais no caixa.</p>
          </div>
        ) : (
          props.items.map((row) => (
            <article key={row.id} className={styles.card}>
              <header className={styles.cardTop}>
                <div>
                  <h2 className={styles.cardTitle}>{row.name}</h2>
                  <p className={styles.cardMeta}>
                    {typeLabel(row.type)} · {scopeLabel(row.scope)}
                  </p>
                </div>
                <Badge variant={statusVariant(row.derivedStatus)}>
                  {statusLabel(row.derivedStatus)}
                </Badge>
              </header>
              <p className={styles.cardMeta}>
                {formatPeriod(row.startsAt, row.endsAt)}
              </p>
              <p className={styles.cardMeta}>
                Prioridade {row.priority} ·{' '}
                {row.scope === 'ALL'
                  ? 'Todos os produtos'
                  : `${row.productCount} alvo(s)`}
              </p>
              <div className={styles.actions}>
                {props.canEdit ? (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => props.onOpenEdit(row.id)}
                  >
                    Editar
                  </button>
                ) : null}
                {props.canActivate &&
                (row.derivedStatus === 'DRAFT' ||
                  row.derivedStatus === 'PAUSED') ? (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => props.onActivate(row.id)}
                  >
                    Ativar
                  </button>
                ) : null}
                {props.canPause && row.derivedStatus === 'ACTIVE' ? (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => props.onPause(row.id)}
                  >
                    Pausar
                  </button>
                ) : null}
              </div>
            </article>
          ))
        )}
      </div>

      <Dialog
        open={props.filtersOpen}
        onClose={props.onCloseFilters}
        title="Filtros"
      >
        <Filters
          search={props.search}
          status={props.status}
          onSearchChange={props.onSearchChange}
          onStatusChange={props.onStatusChange}
        />
      </Dialog>

      <Dialog
        open={props.formOpen}
        onClose={props.onCloseForm}
        title={props.editingId ? 'Editar promoção' : 'Nova promoção'}
        description="O motor de cálculo no servidor define o desconto final."
        footer={
          <>
            <Button variant="ghost" onClick={props.onCloseForm}>
              Cancelar
            </Button>
            <Button loading={props.busy} onClick={props.onSave}>
              Salvar
            </Button>
          </>
        }
      >
        <div className={styles.form}>
          <TextField
            label="Nome"
            value={props.form.name}
            onChange={(e) => props.onFormChange({ name: e.target.value })}
            error={props.formErrors.name}
          />
          <TextField
            label="Descrição"
            value={props.form.description ?? ''}
            onChange={(e) =>
              props.onFormChange({ description: e.target.value })
            }
          />
          <div className={styles.formGrid}>
            <SelectField
              label="Tipo"
              value={props.form.type}
              onChange={(e) =>
                props.onFormChange({
                  type: e.target.value as PromotionFormValues['type'],
                })
              }
              options={[
                { value: 'PERCENT', label: 'Percentual (10% OFF)' },
                { value: 'FIXED', label: 'Valor fixo (R$ 20 OFF)' },
                { value: 'PROMO_PRICE', label: 'Preço promocional' },
                { value: 'MIN_PURCHASE', label: 'Valor mínimo da compra' },
              ]}
            />
            <SelectField
              label="Abrangência"
              value={props.form.scope}
              onChange={(e) =>
                props.onFormChange({
                  scope: e.target.value as PromotionFormValues['scope'],
                  targetIds: [],
                })
              }
              options={[
                { value: 'ALL', label: 'Todos os produtos' },
                { value: 'PRODUCTS', label: 'Produtos específicos' },
                { value: 'CATEGORIES', label: 'Categorias' },
                { value: 'BRANDS', label: 'Marcas' },
              ]}
            />
            <SelectField
              label="Acúmulo"
              value={props.form.stacking}
              onChange={(e) =>
                props.onFormChange({
                  stacking: e.target
                    .value as PromotionFormValues['stacking'],
                })
              }
              options={[
                { value: 'EXCLUSIVE', label: 'Não acumular (maior desconto)' },
                { value: 'STACKABLE', label: 'Permitir acumular' },
              ]}
            />
            <TextField
              label="Prioridade"
              type="number"
              min={1}
              value={String(props.form.priority)}
              onChange={(e) =>
                props.onFormChange({
                  priority: Number(e.target.value) || 1,
                })
              }
              hint="Menor número aplica primeiro."
            />
          </div>
          <div className={styles.formGrid}>
            <TextField
              label="Data inicial"
              type="date"
              value={props.form.startDate}
              onChange={(e) =>
                props.onFormChange({ startDate: e.target.value })
              }
              error={props.formErrors.startDate}
            />
            <TextField
              label="Hora inicial"
              type="time"
              value={props.form.startTime}
              onChange={(e) =>
                props.onFormChange({ startTime: e.target.value })
              }
            />
            <TextField
              label="Data final"
              type="date"
              value={props.form.endDate}
              onChange={(e) => props.onFormChange({ endDate: e.target.value })}
              error={props.formErrors.endDate}
            />
            <TextField
              label="Hora final"
              type="time"
              value={props.form.endTime}
              onChange={(e) => props.onFormChange({ endTime: e.target.value })}
            />
          </div>
          <div className={styles.formGrid}>
            {props.form.type === 'PERCENT' ||
            props.form.type === 'MIN_PURCHASE' ? (
              <TextField
                label="Percentual (%)"
                value={props.form.percentOff ?? ''}
                onChange={(e) =>
                  props.onFormChange({ percentOff: e.target.value })
                }
              />
            ) : null}
            {props.form.type === 'FIXED' ||
            props.form.type === 'MIN_PURCHASE' ? (
              <TextField
                label="Valor fixo (R$)"
                value={props.form.amountOff ?? ''}
                onChange={(e) =>
                  props.onFormChange({ amountOff: e.target.value })
                }
              />
            ) : null}
            {props.form.type === 'PROMO_PRICE' ? (
              <TextField
                label="Preço promocional (R$)"
                value={props.form.promoPrice ?? ''}
                onChange={(e) =>
                  props.onFormChange({ promoPrice: e.target.value })
                }
              />
            ) : null}
            {props.form.type === 'MIN_PURCHASE' ? (
              <TextField
                label="Valor mínimo da compra (R$)"
                value={props.form.minCartValue ?? ''}
                onChange={(e) =>
                  props.onFormChange({ minCartValue: e.target.value })
                }
              />
            ) : null}
            <TextField
              label="Quantidade mínima"
              value={props.form.minQuantity ?? ''}
              onChange={(e) =>
                props.onFormChange({ minQuantity: e.target.value })
              }
            />
            <TextField
              label="Limite por venda"
              value={props.form.maxQtyPerSale ?? ''}
              onChange={(e) =>
                props.onFormChange({ maxQtyPerSale: e.target.value })
              }
            />
          </div>
          {props.form.scope === 'PRODUCTS' ? (
            <div>
              <TextField
                label="Pesquisar produtos"
                value={props.productSearch}
                onChange={(e) => props.onProductSearchChange(e.target.value)}
              />
              {props.formErrors.targetIds ? (
                <p className={styles.fieldError}>{props.formErrors.targetIds}</p>
              ) : null}
              {props.productsLoading ? (
                <p className={styles.muted}>Buscando…</p>
              ) : (
                <ul className={styles.pickerList}>
                  {props.products.map((product) => {
                    const selected = props.form.targetIds.includes(product.id)
                    return (
                      <li key={product.id}>
                        <div>
                          <strong>{product.description}</strong>
                          <span>{product.code}</span>
                        </div>
                        <Button
                          variant={selected ? 'secondary' : 'primary'}
                          onClick={() => props.onToggleTarget(product.id)}
                        >
                          {selected ? 'Remover' : 'Adicionar'}
                        </Button>
                      </li>
                    )
                  })}
                </ul>
              )}
              {props.form.targetIds.length > 0 ? (
                <p className={styles.muted}>
                  {props.form.targetIds.length} produto(s) selecionado(s).
                </p>
              ) : null}
            </div>
          ) : null}
          {props.form.scope === 'CATEGORIES' ? (
            <TargetChecks
              label="Categorias"
              options={props.lookups?.categories ?? []}
              selected={props.form.targetIds}
              error={props.formErrors.targetIds}
              onToggle={props.onToggleTarget}
            />
          ) : null}
          {props.form.scope === 'BRANDS' ? (
            <TargetChecks
              label="Marcas"
              options={props.lookups?.brands ?? []}
              selected={props.form.targetIds}
              error={props.formErrors.targetIds}
              onToggle={props.onToggleTarget}
            />
          ) : null}
          {props.detail ? (
            <p className={styles.muted}>
              Status atual:{' '}
              {statusLabel(props.detail.derivedStatus)}
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={props.simulateOpen}
        onClose={props.onCloseSimulate}
        title="Simular promoção"
        description="Usa o mesmo motor da venda real."
        footer={
          <Button loading={props.busy} onClick={props.onSimulate}>
            Simular
          </Button>
        }
      >
        <div className={styles.form}>
          <TextField
            label="Produto"
            value={props.simulateProductSearch}
            onChange={(e) =>
              props.onSimulateProductSearchChange(e.target.value)
            }
            placeholder="Buscar produto"
          />
          <ul className={styles.pickerList}>
            {props.simulateProducts.map((product) => (
              <li key={product.id}>
                <div>
                  <strong>{product.description}</strong>
                  <span>{product.code}</span>
                </div>
                <Button
                  variant={
                    props.simulateProductId === product.id
                      ? 'secondary'
                      : 'primary'
                  }
                  onClick={() => props.onSimulateProductIdChange(product.id)}
                >
                  {props.simulateProductId === product.id
                    ? 'Selecionado'
                    : 'Usar'}
                </Button>
              </li>
            ))}
          </ul>
          <TextField
            label="Quantidade"
            value={props.simulateQty}
            onChange={(e) => props.onSimulateQtyChange(e.target.value)}
          />
          {props.simulateResult ? (
            <dl className={styles.simResult}>
              <div>
                <dt>Preço original</dt>
                <dd>
                  {props.simulateResult.original.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </dd>
              </div>
              <div>
                <dt>Desconto</dt>
                <dd>
                  {props.simulateResult.discount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </dd>
              </div>
              <div>
                <dt>Preço final</dt>
                <dd>
                  {props.simulateResult.final.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  })}
                </dd>
              </div>
            </dl>
          ) : null}
        </div>
      </Dialog>
    </div>
  )
}

function TargetChecks({
  label,
  options,
  selected,
  error,
  onToggle,
}: {
  label: string
  options: Array<{ id: string; name: string }>
  selected: string[]
  error?: string
  onToggle: (id: string) => void
}) {
  return (
    <fieldset className={styles.checks}>
      <legend>{label}</legend>
      {error ? <p className={styles.fieldError}>{error}</p> : null}
      {options.length === 0 ? (
        <p className={styles.muted}>Nenhum cadastro encontrado.</p>
      ) : (
        options.map((opt) => (
          <label key={opt.id}>
            <input
              type="checkbox"
              checked={selected.includes(opt.id)}
              onChange={() => onToggle(opt.id)}
            />
            {opt.name}
          </label>
        ))
      )}
    </fieldset>
  )
}
