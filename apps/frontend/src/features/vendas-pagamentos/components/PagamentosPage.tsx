import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { Dialog } from '../../../shared/ui/Dialog'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import { formatMoney } from '../../vendas-carrinho'
import type {
  DraftPaymentLine,
  PaymentMethod,
  PaymentReceipt,
  PaymentSession,
} from '../domain/pagamento.schema'
import styles from './PagamentosPage.module.css'

export type PagamentosPageProps = {
  session: PaymentSession | null
  loading: boolean
  busy: boolean
  error: string | null
  methods: PaymentMethod[]
  selectedMethod: string | null
  amountDraft: string
  tenderedDraft: string
  lines: DraftPaymentLine[]
  amountPaid: number
  remaining: number
  changeAmount: number
  canComplete: boolean
  receipt: PaymentReceipt | null
  cancelDialogOpen: boolean
  onSelectMethod: (code: string) => void
  onAmountChange: (value: string) => void
  onTenderedChange: (value: string) => void
  onAddPayment: () => void
  onRemovePayment: (id: string) => void
  onFinalize: () => void
  onAskCancel: () => void
  onCloseCancel: () => void
  onConfirmCancel: () => void
  onPrint: () => void
  onNewSale: () => void
  onRefresh: () => void
}

function SummaryPanel({
  subtotal,
  discounts,
  surcharges,
  total,
  amountPaid,
  remaining,
  changeAmount,
}: {
  subtotal: number
  discounts: number
  surcharges: number
  total: number
  amountPaid: number
  remaining: number
  changeAmount: number
}) {
  return (
    <dl className={styles.summaryList}>
      <div>
        <dt>Subtotal</dt>
        <dd>{formatMoney(subtotal)}</dd>
      </div>
      <div>
        <dt>Descontos</dt>
        <dd>{formatMoney(discounts)}</dd>
      </div>
      <div>
        <dt>Acréscimos</dt>
        <dd>{formatMoney(surcharges)}</dd>
      </div>
      <div className={styles.totalRow}>
        <dt>Total</dt>
        <dd>{formatMoney(total)}</dd>
      </div>
      <div>
        <dt>Valor pago</dt>
        <dd>{formatMoney(amountPaid)}</dd>
      </div>
      <div className={styles.remainingRow}>
        <dt>Valor restante</dt>
        <dd>{formatMoney(remaining)}</dd>
      </div>
      <div className={styles.changeRow}>
        <dt>Troco</dt>
        <dd>{formatMoney(changeAmount)}</dd>
      </div>
    </dl>
  )
}

export function PagamentosPage({
  session,
  loading,
  busy,
  error,
  methods,
  selectedMethod,
  amountDraft,
  tenderedDraft,
  lines,
  amountPaid,
  remaining,
  changeAmount,
  canComplete,
  receipt,
  cancelDialogOpen,
  onSelectMethod,
  onAmountChange,
  onTenderedChange,
  onAddPayment,
  onRemovePayment,
  onFinalize,
  onAskCancel,
  onCloseCancel,
  onConfirmCancel,
  onPrint,
  onNewSale,
  onRefresh,
}: PagamentosPageProps) {
  const method = methods.find((m) => m.code === selectedMethod) ?? null
  const totals = session?.summary

  if (receipt) {
    return (
      <div className={styles.page}>
        <PageHeader
          title="Pagamentos"
          breadcrumbs={[
            { label: 'Vendas', path: '/app/vendas/carrinho' },
            { label: 'Pagamentos' },
          ]}
          description="Confirmação da venda."
        />
        <section className={styles.successHero}>
          <h2>{receipt.message}</h2>
          <p className={styles.hint}>
            Venda #{receipt.saleNumber} ·{' '}
            {new Date(receipt.closedAt).toLocaleString('pt-BR')}
          </p>
        </section>
        <section className={styles.panel}>
          <div className={styles.successMeta}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Número da venda</span>
              <span className={styles.metaValue}>#{receipt.saleNumber}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Valor</span>
              <span className={styles.metaValue}>
                {formatMoney(receipt.totals.total)}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Forma de pagamento</span>
              <span className={styles.metaValue}>
                {receipt.payments.map((p) => p.methodLabel).join(', ')}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Troco</span>
              <span className={styles.metaValue}>
                {formatMoney(receipt.totals.changeAmount)}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Operador</span>
              <span className={styles.metaValue}>{receipt.operator.name}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Cliente</span>
              <span className={styles.metaValue}>
                {receipt.customer?.name ?? 'Não informado'}
              </span>
            </div>
          </div>
          <div className={`${styles.formActions} ${styles.noPrint}`}>
            {receipt.actions.canPrintReceipt ? (
              <Button variant="secondary" onClick={onPrint}>
                Imprimir comprovante
              </Button>
            ) : null}
            {receipt.actions.canSendReceipt ? (
              <Button variant="secondary" disabled>
                Enviar comprovante
              </Button>
            ) : null}
            <Button variant="primary" onClick={onNewSale}>
              Nova venda
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Pagamentos"
        breadcrumbs={[
          { label: 'Vendas', path: '/app/vendas/carrinho' },
          { label: 'Pagamentos' },
        ]}
        description="Finalize a venda com as formas de pagamento disponíveis."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {loading && !session ? (
        <Alert variant="warn" role="status">
          Validando carrinho…
        </Alert>
      ) : null}

      {session && totals ? (
        <div className={styles.layout}>
          <div className={styles.panel}>
            <h2>Formas de pagamento</h2>
            {methods.length === 0 ? (
              <p className={styles.emptyMethods}>
                Nenhuma forma de pagamento habilitada no momento.
              </p>
            ) : (
              <div className={styles.methods}>
                {methods.map((m) => (
                  <button
                    key={m.code}
                    type="button"
                    className={[
                      styles.methodBtn,
                      selectedMethod === m.code ? styles.methodBtnActive : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onClick={() => onSelectMethod(m.code)}
                    disabled={busy}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            )}

            {method ? (
              <>
                <div className={styles.formGrid}>
                  <TextField
                    label="Valor"
                    inputMode="decimal"
                    value={amountDraft}
                    onChange={(e) => onAmountChange(e.target.value)}
                    disabled={busy}
                  />
                  {method.supportsChange ? (
                    <TextField
                      label="Valor recebido"
                      inputMode="decimal"
                      value={tenderedDraft}
                      onChange={(e) => onTenderedChange(e.target.value)}
                      disabled={busy}
                    />
                  ) : null}
                </div>
                {method.supportsChange ? (
                  <p className={styles.hint}>
                    Troco desta linha:{' '}
                    {formatMoney(
                      Math.max(
                        0,
                        (Number(
                          tenderedDraft.replace(',', '.').replace(/[^\d.-]/g, ''),
                        ) || 0) -
                          (Number(
                            amountDraft.replace(',', '.').replace(/[^\d.-]/g, ''),
                          ) || 0),
                      ),
                    )}
                  </p>
                ) : null}
                <div className={styles.formActions}>
                  <Button
                    variant="secondary"
                    onClick={onAddPayment}
                    disabled={busy || remaining <= 0}
                  >
                    {session.allowSplitPayment
                      ? 'Adicionar pagamento'
                      : 'Registrar pagamento'}
                  </Button>
                </div>
              </>
            ) : null}

            {lines.length > 0 ? (
              <>
                <h2>Pagamentos informados</h2>
                <ul className={styles.lines}>
                  {lines.map((line) => (
                    <li key={line.id} className={styles.lineItem}>
                      <div>
                        <strong>{line.methodLabel}</strong>
                        <span className={styles.lineMeta}>
                          {formatMoney(line.amount)}
                          {line.tenderedAmount != null
                            ? ` · recebido ${formatMoney(line.tenderedAmount)}`
                            : ''}
                          {line.changeAmount > 0
                            ? ` · troco ${formatMoney(line.changeAmount)}`
                            : ''}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => onRemovePayment(line.id)}
                        disabled={busy}
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>

          <aside className={styles.panel}>
            <h2>Resumo da venda</h2>
            <SummaryPanel
              subtotal={totals.subtotal}
              discounts={totals.discounts}
              surcharges={totals.surcharges}
              total={totals.total}
              amountPaid={amountPaid}
              remaining={remaining}
              changeAmount={changeAmount}
            />
            {!canComplete && remaining > 0 ? (
              <Alert variant="warn">
                Restante: {formatMoney(remaining)}
              </Alert>
            ) : null}
            <div className={`${styles.stickyActions} ${styles.desktopCheckout}`}>
              <Button
                variant="primary"
                fullWidth
                loading={busy}
                disabled={!canComplete || busy}
                onClick={onFinalize}
              >
                Finalizar pagamento
              </Button>
              <Button
                variant="secondary"
                fullWidth
                disabled={busy}
                onClick={onAskCancel}
              >
                Cancelar
              </Button>
              <Button variant="ghost" fullWidth disabled={busy} onClick={onRefresh}>
                Revalidar carrinho
              </Button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className={`${styles.mobileBar} ${styles.noPrint}`}>
        <Button
          variant="secondary"
          fullWidth
          disabled={busy}
          onClick={onAskCancel}
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          fullWidth
          loading={busy}
          disabled={!canComplete || busy}
          onClick={onFinalize}
        >
          Finalizar
        </Button>
      </div>

      <Dialog
        open={cancelDialogOpen}
        title="Cancelar pagamento?"
        description="A venda voltará ao carrinho. Nenhuma cobrança será registrada."
        onClose={onCloseCancel}
        footer={
          <>
            <Button variant="secondary" onClick={onCloseCancel} disabled={busy}>
              Continuar pagando
            </Button>
            <Button variant="primary" onClick={onConfirmCancel} loading={busy}>
              Confirmar cancelamento
            </Button>
          </>
        }
      />
    </div>
  )
}
