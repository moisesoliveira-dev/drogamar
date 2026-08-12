import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { Dialog } from '../../../shared/ui/Dialog'
import { Table, type TableColumn } from '../../../shared/ui/Table'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import {
  formatDocument,
  formatMoney,
  type CustomerSearchItem,
  type ProductSearchItem,
  type SaleCart,
  type SaleCartItem,
} from '../../vendas-carrinho'
import type {
  CashCloseSummary,
  CashRegister,
  CashSession,
} from '../domain/balcao.schema'
import styles from './BalcaoPage.module.css'

export type BalcaoPageProps = {
  online: boolean
  clock: string
  operatorName: string
  caixaOpen: boolean
  session: CashSession | null
  registers: CashRegister[]
  selectedRegisterId: string | null
  openingAmount: string
  openingNotes: string
  cart: SaleCart | null
  loading: boolean
  busy: boolean
  error: string | null
  search: string
  products: ProductSearchItem[]
  productsLoading: boolean
  productDialogOpen: boolean
  productSearch: string
  customers: CustomerSearchItem[]
  customersLoading: boolean
  customerDialogOpen: boolean
  customerSearch: string
  held: SaleCart[]
  heldDialogOpen: boolean
  closeDialogOpen: boolean
  closeSummary: CashCloseSummary | null
  closingAmount: string
  closingNotes: string
  cancelSaleDialogOpen: boolean
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onBindSearchInput: (el: HTMLInputElement | null) => void
  onOpenProducts: () => void
  onCloseProducts: () => void
  onProductSearchChange: (value: string) => void
  onAddProduct: (stockItemId: string) => void
  onOpenCustomers: () => void
  onCloseCustomers: () => void
  onCustomerSearchChange: (value: string) => void
  onSelectCustomer: (customerId: string) => void
  onClearCustomer: () => void
  onQuantityChange: (lineId: string, quantity: number) => void
  onLineDiscountChange: (lineId: string, discount: number) => void
  onRemoveItem: (lineId: string) => void
  onCartDiscountChange: (value: number) => void
  onPay: () => void
  onNewSale: () => void
  onAskCancelSale: () => void
  onCloseCancelSale: () => void
  onConfirmCancelSale: () => void
  onHold: () => void
  onOpenHeld: () => void
  onCloseHeld: () => void
  onResume: (cartId: string) => void
  onOpenAiSearch: () => void
  onOpenDiscounts: () => void
  onSelectRegister: (id: string) => void
  onOpeningAmountChange: (value: string) => void
  onOpeningNotesChange: (value: string) => void
  onOpenCaixa: () => void
  onAskCloseCaixa: () => void
  onCloseCloseDialog: () => void
  onClosingAmountChange: (value: string) => void
  onClosingNotesChange: (value: string) => void
  onConfirmCloseCaixa: () => void
}

export function BalcaoPage(props: BalcaoPageProps) {
  const items = props.cart?.items ?? []
  const payDisabled =
    props.busy ||
    props.loading ||
    !props.caixaOpen ||
    !props.cart?.canCheckout ||
    items.length === 0

  const columns: TableColumn<SaleCartItem>[] = [
    {
      id: 'product',
      header: 'Produto',
      cell: (row) => (
        <div className={styles.productCell}>
          <strong>{row.productDescription}</strong>
          <span className={styles.metaRow}>
            <span className={styles.mono}>{row.productCode}</span>
            {row.outOfStock ? <Badge variant="danger">Sem estoque</Badge> : null}
          </span>
        </div>
      ),
    },
    {
      id: 'qty',
      header: 'Qtd',
      cell: (row) => (
        <div className={styles.qtyControls}>
          <button
            type="button"
            className={styles.qtyBtn}
            disabled={props.busy || row.quantity <= 1}
            onClick={() =>
              props.onQuantityChange(row.id, Math.max(0.0001, row.quantity - 1))
            }
          >
            −
          </button>
          <input
            className={styles.qtyInput}
            type="number"
            min={0.0001}
            step={1}
            defaultValue={row.quantity}
            key={`${row.id}-${row.quantity}`}
            disabled={props.busy}
            onBlur={(e) => {
              const value = Number(e.target.value)
              if (!Number.isFinite(value) || value <= 0) return
              if (value === row.quantity) return
              props.onQuantityChange(row.id, value)
            }}
          />
          <button
            type="button"
            className={styles.qtyBtn}
            disabled={props.busy}
            onClick={() => props.onQuantityChange(row.id, row.quantity + 1)}
          >
            +
          </button>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Preço',
      align: 'right',
      cell: (row) => formatMoney(row.unitPrice),
    },
    {
      id: 'discount',
      header: 'Desconto',
      align: 'right',
      cell: (row) => (
        <input
          className={styles.moneyInput}
          type="number"
          min={0}
          step={0.01}
          defaultValue={row.lineDiscount}
          key={`${row.id}-d-${row.lineDiscount}`}
          disabled={props.busy}
          onBlur={(e) => {
            const value = Number(e.target.value)
            if (!Number.isFinite(value) || value < 0) return
            if (value === row.lineDiscount) return
            props.onLineDiscountChange(row.id, value)
          }}
        />
      ),
    },
    {
      id: 'stock',
      header: 'Estoque',
      align: 'right',
      cell: (row) =>
        row.trackStock ? row.availableStock.toLocaleString('pt-BR') : '—',
    },
    {
      id: 'total',
      header: 'Total',
      align: 'right',
      cell: (row) => <strong>{formatMoney(row.lineSubtotal)}</strong>,
    },
    {
      id: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          disabled={props.busy}
          onClick={() => props.onRemoveItem(row.id)}
        >
          Remover
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        title="Balcão / Caixa"
        breadcrumbs={[
          { label: 'Vendas', path: '/app/vendas/carrinho' },
          { label: 'F4 — Balcão' },
        ]}
        description="Operação contínua de PDV. Pagamento é confirmado no F3."
        actions={
          props.caixaOpen ? (
            <Button
              variant="secondary"
              disabled={props.busy}
              onClick={props.onAskCloseCaixa}
            >
              Fechar caixa
            </Button>
          ) : null
        }
      />

      <section className={styles.headerBar} aria-label="Status do caixa">
        <div className={styles.headerItem}>
          <span className={styles.metaLabel}>Caixa</span>
          <span className={styles.metaValue}>
            {props.session?.register.name ??
              props.registers[0]?.name ??
              'Caixa'}
          </span>
        </div>
        <div className={styles.headerItem}>
          <span className={styles.metaLabel}>Operador</span>
          <span className={styles.metaValue}>{props.operatorName}</span>
        </div>
        <div className={styles.headerItem}>
          <span className={styles.metaLabel}>Status</span>
          <span
            className={`${styles.metaValue} ${
              props.caixaOpen ? styles.statusOpen : styles.statusClosed
            }`}
          >
            {props.caixaOpen ? 'Caixa aberto' : 'Caixa fechado'}
          </span>
        </div>
        <div className={styles.headerItem}>
          <span className={styles.metaLabel}>Data/hora</span>
          <span className={styles.metaValue}>{props.clock}</span>
        </div>
        <div className={styles.headerItem}>
          <span className={styles.metaLabel}>Cliente</span>
          <span className={styles.metaValue}>
            {props.cart?.customer?.name ?? 'Consumidor não identificado'}
          </span>
        </div>
        <div className={styles.headerItem}>
          <span className={styles.metaLabel}>Conexão</span>
          <span
            className={`${styles.metaValue} ${
              props.online ? styles.statusOpen : styles.statusOffline
            }`}
          >
            {props.online ? 'Online' : 'Offline'}
          </span>
        </div>
      </section>

      {props.error ? <Alert variant="danger">{props.error}</Alert> : null}
      {!props.online ? (
        <Alert variant="warn">
          Sem conexão. Vendas financeiras não são armazenadas localmente.
        </Alert>
      ) : null}

      {!props.caixaOpen ? (
        <section className={styles.closedPanel}>
          <h2>Caixa fechado</h2>
          <p>Abra o caixa para iniciar vendas no balcão.</p>
          {props.registers.length > 1 ? (
            <label className={styles.hint}>
              Caixa
              <select
                value={props.selectedRegisterId ?? props.registers[0]?.id ?? ''}
                onChange={(e) => props.onSelectRegister(e.target.value)}
              >
                {props.registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <TextField
            label="Valor inicial / fundo de caixa"
            inputMode="decimal"
            value={props.openingAmount}
            onChange={(e) => props.onOpeningAmountChange(e.target.value)}
          />
          <TextField
            label="Observação"
            value={props.openingNotes}
            onChange={(e) => props.onOpeningNotesChange(e.target.value)}
          />
          <Button
            variant="primary"
            loading={props.busy}
            onClick={props.onOpenCaixa}
          >
            Abrir caixa
          </Button>
        </section>
      ) : (
        <>
          <form
            className={styles.searchRow}
            onSubmit={(e) => {
              e.preventDefault()
              props.onSearchSubmit()
            }}
          >
            <TextField
              ref={(el) => props.onBindSearchInput(el)}
              label="Busca produto / código de barras"
              placeholder="Digite ou escaneie o código, SKU ou nome"
              value={props.search}
              autoComplete="off"
              spellCheck={false}
              disabled={props.busy}
              onChange={(e) => props.onSearchChange(e.target.value)}
            />
            <Button type="submit" variant="primary" loading={props.busy}>
              Buscar
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={props.busy}
              onClick={props.onOpenProducts}
            >
              Nome/SKU
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={props.busy}
              onClick={props.onOpenAiSearch}
            >
              F5 IA
            </Button>
          </form>

          <div className={styles.layout}>
            <section className={styles.panel}>
              {items.length === 0 && !props.loading ? (
                <div className={styles.emptyState}>
                  <h2>Nenhum produto na venda</h2>
                  <p>Escaneie um código ou busque pelo nome para começar.</p>
                </div>
              ) : (
                <Table
                  columns={columns}
                  rows={items}
                  rowKey={(row) => row.id}
                />
              )}
            </section>

            <aside className={`${styles.panel} ${styles.summary}`}>
              <h2>Resumo</h2>
              <dl className={styles.summaryList}>
                <div>
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(props.cart?.totals.subtotal ?? 0)}</dd>
                </div>
                <div>
                  <dt>Descontos</dt>
                  <dd>{formatMoney(props.cart?.totals.discounts ?? 0)}</dd>
                </div>
                <div>
                  <dt>Acréscimos</dt>
                  <dd>{formatMoney(props.cart?.totals.surcharges ?? 0)}</dd>
                </div>
                <div className={styles.totalRow}>
                  <dt>TOTAL</dt>
                  <dd>{formatMoney(props.cart?.totals.total ?? 0)}</dd>
                </div>
              </dl>
              <TextField
                label="Desconto do carrinho"
                inputMode="decimal"
                defaultValue={String(props.cart?.totals.cartDiscount ?? 0)}
                key={props.cart?.totals.cartDiscount}
                disabled={props.busy}
                onBlur={(e) => {
                  const value = Number(
                    e.target.value.replace(',', '.').replace(/[^\d.-]/g, ''),
                  )
                  if (!Number.isFinite(value) || value < 0) return
                  props.onCartDiscountChange(value)
                }}
              />
              <p className={styles.hint}>
                Promoções automáticas entram pelo F6 quando disponíveis.
              </p>
              <div className={`${styles.actions} ${styles.desktopPay}`}>
                <Button
                  variant="primary"
                  fullWidth
                  disabled={payDisabled}
                  onClick={props.onPay}
                >
                  Pagamento (F3)
                </Button>
                <Button
                  variant="secondary"
                  fullWidth
                  disabled={props.busy || items.length === 0}
                  onClick={props.onHold}
                >
                  Suspender venda
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={props.busy}
                  onClick={props.onOpenHeld}
                >
                  Recuperar venda
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={props.busy || items.length === 0}
                  onClick={props.onAskCancelSale}
                >
                  Cancelar venda
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={props.busy}
                  onClick={props.onOpenCustomers}
                >
                  Selecionar cliente
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={props.busy || !props.cart?.customer}
                  onClick={props.onClearCustomer}
                >
                  Consumidor não identificado
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={props.busy}
                  onClick={props.onOpenDiscounts}
                >
                  F6 Descontos
                </Button>
                <Button
                  variant="ghost"
                  fullWidth
                  disabled={props.busy || items.length > 0}
                  onClick={props.onNewSale}
                >
                  Nova venda
                </Button>
              </div>
            </aside>
          </div>

          <div className={styles.mobileBar}>
            <Button
              variant="secondary"
              fullWidth
              disabled={props.busy}
              onClick={props.onAskCancelSale}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              fullWidth
              disabled={payDisabled}
              onClick={props.onPay}
            >
              Pagamento
            </Button>
          </div>
        </>
      )}

      <Dialog
        open={props.productDialogOpen}
        title="Buscar produto"
        onClose={props.onCloseProducts}
      >
        <TextField
          label="Nome, código ou SKU"
          value={props.productSearch}
          onChange={(e) => props.onProductSearchChange(e.target.value)}
        />
        {props.productsLoading ? <p className={styles.hint}>Buscando…</p> : null}
        <ul className={styles.pickerList}>
          {props.products.map((p) => (
            <li key={p.id} className={styles.pickerItem}>
              <div>
                <strong>{p.description}</strong>
                <span className={styles.pickerMeta}>
                  {p.code} · {p.sku ?? 's/ SKU'} · {formatMoney(p.salePrice)}
                </span>
              </div>
              <Button
                disabled={props.busy || !p.hasValidPrice || p.outOfStock}
                onClick={() => props.onAddProduct(p.id)}
              >
                Adicionar
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={props.customerDialogOpen}
        title="Selecionar cliente"
        onClose={props.onCloseCustomers}
      >
        <TextField
          label="Nome, código ou documento"
          value={props.customerSearch}
          onChange={(e) => props.onCustomerSearchChange(e.target.value)}
        />
        <ul className={styles.pickerList}>
          {props.customers.map((c) => (
            <li key={c.id} className={styles.pickerItem}>
              <div>
                <strong>{c.name}</strong>
                <span className={styles.pickerMeta}>
                  {c.code}
                  {formatDocument(c.documentType, c.document)
                    ? ` · ${formatDocument(c.documentType, c.document)}`
                    : ''}
                </span>
              </div>
              <Button onClick={() => props.onSelectCustomer(c.id)}>
                Selecionar
              </Button>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={props.heldDialogOpen}
        title="Vendas suspensas"
        onClose={props.onCloseHeld}
      >
        {props.held.length === 0 ? (
          <p className={styles.hint}>Nenhuma venda suspensa.</p>
        ) : (
          <ul className={styles.pickerList}>
            {props.held.map((sale) => (
              <li key={sale.id} className={styles.pickerItem}>
                <div>
                  <strong>Venda #{sale.sequentialId}</strong>
                  <span className={styles.pickerMeta}>
                    {sale.customer?.name ?? 'Consumidor'} · {sale.items.length}{' '}
                    itens · {formatMoney(sale.totals.total)} · Suspensa
                  </span>
                </div>
                <Button onClick={() => props.onResume(sale.id)}>Retomar</Button>
              </li>
            ))}
          </ul>
        )}
      </Dialog>

      <Dialog
        open={props.cancelSaleDialogOpen}
        title="Cancelar venda?"
        description="Os itens serão removidos do carrinho atual."
        onClose={props.onCloseCancelSale}
        footer={
          <>
            <Button variant="secondary" onClick={props.onCloseCancelSale}>
              Voltar
            </Button>
            <Button variant="primary" onClick={props.onConfirmCancelSale}>
              Confirmar
            </Button>
          </>
        }
      />

      <Dialog
        open={props.closeDialogOpen}
        title="Fechar caixa"
        onClose={props.onCloseCloseDialog}
        footer={
          <>
            <Button variant="secondary" onClick={props.onCloseCloseDialog}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={props.onConfirmCloseCaixa}>
              Confirmar fechamento
            </Button>
          </>
        }
      >
        {props.closeSummary ? (
          <div className={styles.closeGrid}>
            <span>Total vendido</span>
            <strong>{formatMoney(props.closeSummary.totalSold)}</strong>
            <span>Dinheiro</span>
            <strong>{formatMoney(props.closeSummary.cash)}</strong>
            <span>PIX</span>
            <strong>{formatMoney(props.closeSummary.pix)}</strong>
            <span>Cartão</span>
            <strong>{formatMoney(props.closeSummary.card)}</strong>
            <span>Outros</span>
            <strong>{formatMoney(props.closeSummary.other)}</strong>
            <span>Sangrias</span>
            <strong>{formatMoney(props.closeSummary.sangrias)}</strong>
            <span>Suprimentos</span>
            <strong>{formatMoney(props.closeSummary.suprimentos)}</strong>
            <span>Valor esperado</span>
            <strong>{formatMoney(props.closeSummary.expectedAmount)}</strong>
          </div>
        ) : null}
        <TextField
          label="Valor informado"
          inputMode="decimal"
          value={props.closingAmount}
          onChange={(e) => props.onClosingAmountChange(e.target.value)}
        />
        <TextField
          label="Observação"
          value={props.closingNotes}
          onChange={(e) => props.onClosingNotesChange(e.target.value)}
        />
      </Dialog>
    </div>
  )
}
