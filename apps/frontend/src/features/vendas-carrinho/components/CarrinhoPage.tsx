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
} from '../domain/carrinho.schema'
import styles from './CarrinhoPage.module.css'

export type CarrinhoPageProps = {
  cart: SaleCart | null
  loading: boolean
  busy: boolean
  error: string | null
  productDialogOpen: boolean
  customerDialogOpen: boolean
  productSearch: string
  customerSearch: string
  products: ProductSearchItem[]
  productsLoading: boolean
  customers: CustomerSearchItem[]
  customersLoading: boolean
  cartDiscountDraft: string
  canAddItem: boolean
  canEditQuantity: boolean
  canRemoveItem: boolean
  canApplyDiscount: boolean
  canSelectCustomer: boolean
  canCheckout: boolean
  canClear: boolean
  onOpenProducts: () => void
  onCloseProducts: () => void
  onOpenCustomers: () => void
  onCloseCustomers: () => void
  onProductSearchChange: (value: string) => void
  onCustomerSearchChange: (value: string) => void
  onAddProduct: (stockItemId: string) => void
  onSelectCustomer: (customerId: string) => void
  onClearCustomer: () => void
  onQuantityChange: (lineId: string, quantity: number) => void
  onLineDiscountChange: (lineId: string, lineDiscount: number) => void
  onRemoveItem: (lineId: string) => void
  onCartDiscountDraftChange: (value: string) => void
  onApplyCartDiscount: () => void
  onClearCart: () => void
  onCheckout: () => void
  onRefresh: () => void
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR')
}

export function CarrinhoPage({
  cart,
  loading,
  busy,
  error,
  productDialogOpen,
  customerDialogOpen,
  productSearch,
  customerSearch,
  products,
  productsLoading,
  customers,
  customersLoading,
  cartDiscountDraft,
  canAddItem,
  canEditQuantity,
  canRemoveItem,
  canApplyDiscount,
  canSelectCustomer,
  canCheckout,
  canClear,
  onOpenProducts,
  onCloseProducts,
  onOpenCustomers,
  onCloseCustomers,
  onProductSearchChange,
  onCustomerSearchChange,
  onAddProduct,
  onSelectCustomer,
  onClearCustomer,
  onQuantityChange,
  onLineDiscountChange,
  onRemoveItem,
  onCartDiscountDraftChange,
  onApplyCartDiscount,
  onClearCart,
  onCheckout,
  onRefresh,
}: CarrinhoPageProps) {
  const items = cart?.items ?? []
  const empty = !loading && items.length === 0
  const checkoutDisabled =
    busy || loading || !canCheckout || !cart?.canCheckout || items.length === 0

  const columns: TableColumn<SaleCartItem>[] = [
    {
      id: 'product',
      header: 'Produto',
      cell: (row) => (
        <div className={styles.productCell}>
          <strong>{row.productDescription}</strong>
          <span className={styles.metaRow}>
            {row.outOfStock ? (
              <Badge variant="danger">Sem estoque</Badge>
            ) : null}
            {row.invalidPrice ? (
              <Badge variant="warn">Preço inválido</Badge>
            ) : null}
            {row.itemStatus === 'INACTIVE' ? (
              <Badge variant="neutral">Inativo</Badge>
            ) : null}
          </span>
        </div>
      ),
    },
    {
      id: 'sku',
      header: 'SKU/código',
      cell: (row) => (
        <span className={styles.mono}>
          {row.sku ?? row.productCode}
        </span>
      ),
    },
    {
      id: 'qty',
      header: 'Quantidade',
      cell: (row) => (
        <div className={styles.qtyControls}>
          <button
            type="button"
            className={styles.qtyBtn}
            disabled={!canEditQuantity || busy || row.quantity <= 1}
            onClick={() =>
              onQuantityChange(row.id, Math.max(0.0001, row.quantity - 1))
            }
            aria-label="Diminuir quantidade"
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
            disabled={!canEditQuantity || busy}
            onBlur={(e) => {
              const value = Number(e.target.value)
              if (!Number.isFinite(value) || value <= 0) return
              if (value === row.quantity) return
              onQuantityChange(row.id, value)
            }}
            aria-label={`Quantidade de ${row.productDescription}`}
          />
          <button
            type="button"
            className={styles.qtyBtn}
            disabled={!canEditQuantity || busy}
            onClick={() => onQuantityChange(row.id, row.quantity + 1)}
            aria-label="Aumentar quantidade"
          >
            +
          </button>
        </div>
      ),
    },
    {
      id: 'unit',
      header: 'Unidade',
      cell: (row) => row.unitCode ?? '—',
    },
    {
      id: 'unitPrice',
      header: 'Preço unitário',
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
          disabled={!canApplyDiscount || busy}
          onBlur={(e) => {
            const value = Number(e.target.value)
            if (!Number.isFinite(value) || value < 0) return
            if (value === row.lineDiscount) return
            onLineDiscountChange(row.id, value)
          }}
          aria-label={`Desconto de ${row.productDescription}`}
        />
      ),
    },
    {
      id: 'subtotal',
      header: 'Subtotal',
      align: 'right',
      cell: (row) => <strong>{formatMoney(row.lineSubtotal)}</strong>,
    },
    {
      id: 'actions',
      header: 'Ações',
      cell: (row) => (
        <Button
          variant="ghost"
          disabled={!canRemoveItem || busy}
          onClick={() => onRemoveItem(row.id)}
        >
          Remover
        </Button>
      ),
    },
  ]

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumbs={[
          { label: 'Vendas', path: '/app/vendas/carrinho' },
          { label: 'F1 — Carrinho Cliente' },
        ]}
        title="Carrinho"
        description="Revise os produtos e os valores antes de finalizar a venda."
        actions={
          <>
            <Button variant="secondary" disabled={busy} onClick={onRefresh}>
              Atualizar
            </Button>
            {canAddItem ? (
              <Button disabled={busy} onClick={onOpenProducts}>
                Adicionar produto
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {cart?.itemsUpdatedMessage ? (
        <Alert variant="warn">{cart.itemsUpdatedMessage}</Alert>
      ) : null}

      <section className={styles.saleMeta} aria-label="Identificação da venda">
        <div>
          <span className={styles.metaLabel}>Venda</span>
          <strong>
            {cart ? `#${cart.sequentialId}` : loading ? '…' : '—'}
          </strong>
        </div>
        <div>
          <span className={styles.metaLabel}>Cliente</span>
          <strong>
            {cart?.customer?.name ?? 'Cliente não identificado'}
          </strong>
          {cart?.customer ? (
            <span className={styles.metaHint}>
              {[
                cart.customer.code,
                formatDocument(
                  cart.customer.documentType,
                  cart.customer.document,
                ),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          ) : null}
        </div>
        <div>
          <span className={styles.metaLabel}>Vendedor/operador</span>
          <strong>{cart?.operator.name ?? '—'}</strong>
        </div>
        <div>
          <span className={styles.metaLabel}>Data/hora</span>
          <strong>
            {cart ? formatDateTime(cart.updatedAt) : '—'}
          </strong>
        </div>
        <div className={styles.metaActions}>
          {canSelectCustomer ? (
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={onOpenCustomers}
              >
                Selecionar cliente
              </Button>
              {cart?.customer ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={onClearCustomer}
                >
                  Remover cliente
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </section>

      <div className={styles.layout}>
        <section className={styles.main} aria-label="Lista de produtos">
          {empty ? (
            <div className={styles.emptyState}>
              <h2>Seu carrinho está vazio</h2>
              <p>Adicione produtos para começar uma venda.</p>
              {canAddItem ? (
                <Button disabled={busy} onClick={onOpenProducts}>
                  Adicionar produto
                </Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className={styles.desktopTable}>
                <Table
                  columns={columns}
                  rows={items}
                  rowKey={(row) => row.id}
                  loading={loading}
                  emptyTitle="Seu carrinho está vazio"
                  emptyDescription="Adicione produtos para começar uma venda."
                />
              </div>
              <div className={styles.mobileList}>
                {loading ? (
                  <p className={styles.muted}>Carregando…</p>
                ) : (
                  items.map((row) => (
                    <article key={row.id} className={styles.mobileCard}>
                      <header>
                        <strong>{row.productDescription}</strong>
                        <span className={styles.mono}>
                          {row.sku ?? row.productCode}
                        </span>
                      </header>
                      <div className={styles.metaRow}>
                        {row.outOfStock ? (
                          <Badge variant="danger">Sem estoque</Badge>
                        ) : null}
                        {row.invalidPrice ? (
                          <Badge variant="warn">Preço inválido</Badge>
                        ) : null}
                      </div>
                      <dl className={styles.mobileFacts}>
                        <div>
                          <dt>Unidade</dt>
                          <dd>{row.unitCode ?? '—'}</dd>
                        </div>
                        <div>
                          <dt>Preço unitário</dt>
                          <dd>{formatMoney(row.unitPrice)}</dd>
                        </div>
                        <div>
                          <dt>Subtotal</dt>
                          <dd>{formatMoney(row.lineSubtotal)}</dd>
                        </div>
                      </dl>
                      <div className={styles.qtyControls}>
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          disabled={!canEditQuantity || busy || row.quantity <= 1}
                          onClick={() =>
                            onQuantityChange(
                              row.id,
                              Math.max(0.0001, row.quantity - 1),
                            )
                          }
                        >
                          −
                        </button>
                        <input
                          className={styles.qtyInput}
                          type="number"
                          min={0.0001}
                          defaultValue={row.quantity}
                          key={`${row.id}-m-${row.quantity}`}
                          disabled={!canEditQuantity || busy}
                          onBlur={(e) => {
                            const value = Number(e.target.value)
                            if (!Number.isFinite(value) || value <= 0) return
                            if (value === row.quantity) return
                            onQuantityChange(row.id, value)
                          }}
                        />
                        <button
                          type="button"
                          className={styles.qtyBtn}
                          disabled={!canEditQuantity || busy}
                          onClick={() =>
                            onQuantityChange(row.id, row.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>
                      {canRemoveItem ? (
                        <Button
                          variant="ghost"
                          disabled={busy}
                          onClick={() => onRemoveItem(row.id)}
                        >
                          Remover
                        </Button>
                      ) : null}
                    </article>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        <aside className={styles.summary} aria-label="Resumo da venda">
          <h2>Resumo</h2>
          <dl className={styles.summaryList}>
            <div>
              <dt>Subtotal</dt>
              <dd>{formatMoney(cart?.totals.subtotal ?? 0)}</dd>
            </div>
            <div>
              <dt>Descontos</dt>
              <dd>− {formatMoney(cart?.totals.discounts ?? 0)}</dd>
            </div>
            {(cart?.totals.surcharges ?? 0) > 0 ? (
              <div>
                <dt>Acréscimos</dt>
                <dd>{formatMoney(cart?.totals.surcharges ?? 0)}</dd>
              </div>
            ) : null}
            <div className={styles.totalRow}>
              <dt>Total</dt>
              <dd>{formatMoney(cart?.totals.total ?? 0)}</dd>
            </div>
          </dl>

          {canApplyDiscount ? (
            <div className={styles.discountBox}>
              <TextField
                label="Desconto do carrinho"
                value={cartDiscountDraft}
                onChange={(e) => onCartDiscountDraftChange(e.target.value)}
                disabled={busy || empty}
              />
              <Button
                variant="secondary"
                disabled={busy || empty}
                onClick={onApplyCartDiscount}
              >
                Aplicar desconto
              </Button>
            </div>
          ) : null}

          <div className={styles.summaryActions}>
            {canClear && !empty ? (
              <Button
                variant="ghost"
                disabled={busy}
                onClick={onClearCart}
              >
                Limpar carrinho
              </Button>
            ) : null}
            <Button
              fullWidth
              loading={busy}
              disabled={checkoutDisabled}
              onClick={onCheckout}
            >
              Ir para pagamento
            </Button>
          </div>
          <p className={styles.hint}>
            Totais calculados pelo servidor. Pagamento e baixa de estoque
            ocorrem nas próximas etapas (F3/F4).
          </p>
        </aside>
      </div>

      <div className={styles.mobileCheckoutBar}>
        <div>
          <span>Total</span>
          <strong>{formatMoney(cart?.totals.total ?? 0)}</strong>
        </div>
        <Button
          loading={busy}
          disabled={checkoutDisabled}
          onClick={onCheckout}
        >
          Ir para pagamento
        </Button>
      </div>

      <Dialog
        open={productDialogOpen}
        onClose={onCloseProducts}
        title="Adicionar produto"
      >
        <div className={styles.dialogBody}>
          <TextField
            label="Buscar produto"
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            placeholder="Código, SKU, descrição ou código de barras"
          />
          {productsLoading ? (
            <p className={styles.muted}>Buscando…</p>
          ) : products.length === 0 ? (
            <p className={styles.muted}>Nenhum produto encontrado.</p>
          ) : (
            <ul className={styles.pickerList}>
              {products.map((product) => {
                const blocked =
                  !product.hasValidPrice || product.outOfStock
                return (
                  <li key={product.id}>
                    <div>
                      <strong>{product.description}</strong>
                      <span className={styles.metaHint}>
                        {product.code}
                        {product.sku ? ` · ${product.sku}` : ''}
                        {' · '}
                        {formatMoney(product.salePrice)}
                        {' · Est. '}
                        {product.currentStock}
                      </span>
                      <span className={styles.metaRow}>
                        {!product.hasValidPrice ? (
                          <Badge variant="warn">Preço inválido</Badge>
                        ) : null}
                        {product.outOfStock ? (
                          <Badge variant="danger">Sem estoque</Badge>
                        ) : null}
                      </span>
                    </div>
                    <Button
                      disabled={busy || blocked}
                      onClick={() => onAddProduct(product.id)}
                    >
                      Adicionar
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Dialog>

      <Dialog
        open={customerDialogOpen}
        onClose={onCloseCustomers}
        title="Selecionar cliente"
      >
        <div className={styles.dialogBody}>
          <TextField
            label="Buscar cliente"
            value={customerSearch}
            onChange={(e) => onCustomerSearchChange(e.target.value)}
            placeholder="Nome, código ou documento"
          />
          {customersLoading ? (
            <p className={styles.muted}>Buscando…</p>
          ) : customers.length === 0 ? (
            <p className={styles.muted}>Nenhum cliente encontrado.</p>
          ) : (
            <ul className={styles.pickerList}>
              {customers.map((customer) => (
                <li key={customer.id}>
                  <div>
                    <strong>{customer.name}</strong>
                    <span className={styles.metaHint}>
                      {[
                        customer.code,
                        formatDocument(
                          customer.documentType,
                          customer.document,
                        ),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </div>
                  <Button
                    disabled={busy}
                    onClick={() => onSelectCustomer(customer.id)}
                  >
                    Selecionar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Dialog>
    </div>
  )
}
