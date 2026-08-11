import { useRef } from 'react'
import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import { formatMoney } from '../../vendas-carrinho'
import {
  resolveLookupStatus,
  statusMessage,
  type BarcodeLookupResult,
  type BarcodeProduct,
} from '../domain/codigo-barras.schema'
import styles from './CodigoBarrasPage.module.css'

export type CodigoBarrasPageProps = {
  code: string
  quantity: string
  result: BarcodeLookupResult | null
  loading: boolean
  adding: boolean
  error: string | null
  feedback: string | null
  canAdd: boolean
  onCodeChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onSearch: () => void
  onAddToCart: () => void
  onGoToCart: () => void
  onInputRef?: (el: HTMLInputElement | null) => void
}

function ProductCard({
  product,
  quantity,
  adding,
  canAdd,
  onQuantityChange,
  onAddToCart,
}: {
  product: BarcodeProduct
  quantity: string
  adding: boolean
  canAdd: boolean
  onQuantityChange: (value: string) => void
  onAddToCart: () => void
}) {
  return (
    <section className={styles.resultPanel} aria-live="polite">
      <div className={styles.imageBox}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt="" />
        ) : (
          <span>Sem imagem</span>
        )}
      </div>
      <div className={styles.details}>
        <div className={styles.titleRow}>
          <h2>{product.description}</h2>
          {product.outOfStock ? (
            <Badge variant="danger">Sem estoque</Badge>
          ) : null}
          {product.status === 'INACTIVE' ? (
            <Badge variant="neutral">Indisponível</Badge>
          ) : null}
          {!product.hasValidPrice ? (
            <Badge variant="warn">Preço inválido</Badge>
          ) : null}
        </div>
        <div className={styles.metaGrid}>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Código</span>
            <span className={`${styles.metaValue} ${styles.mono}`}>
              {product.code}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>SKU</span>
            <span className={`${styles.metaValue} ${styles.mono}`}>
              {product.sku ?? '—'}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Código de barras</span>
            <span className={`${styles.metaValue} ${styles.mono}`}>
              {product.barcode ?? '—'}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Estoque</span>
            <span className={styles.metaValue}>
              {product.trackStock
                ? product.currentStock.toLocaleString('pt-BR')
                : 'Não controlado'}
            </span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Unidade</span>
            <span className={styles.metaValue}>{product.unitCode ?? '—'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.metaLabel}>Preço</span>
            <span className={styles.price}>{formatMoney(product.salePrice)}</span>
          </div>
        </div>
        {product.canAdd ? (
          <div className={styles.actions}>
            <TextField
              className={styles.qtyField}
              label="Quantidade"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => onQuantityChange(e.target.value)}
              disabled={adding}
            />
            <Button
              variant="primary"
              loading={adding}
              disabled={!canAdd || adding}
              onClick={onAddToCart}
            >
              Adicionar ao carrinho
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function CodigoBarrasPage({
  code,
  quantity,
  result,
  loading,
  adding,
  error,
  feedback,
  canAdd,
  onCodeChange,
  onQuantityChange,
  onSearch,
  onAddToCart,
  onGoToCart,
  onInputRef,
}: CodigoBarrasPageProps) {
  const localRef = useRef<HTMLInputElement | null>(null)
  const status = resolveLookupStatus(result)
  const message = statusMessage(status)
  const product = result?.found ? result.product : null

  return (
    <div className={styles.page}>
      <PageHeader
        title="Busca de Código de Barras"
        breadcrumbs={[
          { label: 'Vendas', path: '/app/vendas/carrinho' },
          { label: 'Código de Barras' },
        ]}
        description="Leitura rápida para balcão: escaneie ou digite o código e adicione ao carrinho."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {feedback ? (
        <Alert variant="success" role="status">
          {feedback}
        </Alert>
      ) : null}

      <section className={styles.searchPanel}>
        <form
          className={styles.searchRow}
          onSubmit={(e) => {
            e.preventDefault()
            onSearch()
          }}
        >
          <TextField
            ref={(el) => {
              localRef.current = el
              onInputRef?.(el)
            }}
            label="Código de barras"
            placeholder="Digite ou escaneie o código"
            value={code}
            autoComplete="off"
            autoFocus
            spellCheck={false}
            inputMode="text"
            disabled={loading || adding}
            onChange={(e) => onCodeChange(e.target.value)}
          />
          <TextField
            className={styles.qtyField}
            label="Qtd."
            inputMode="decimal"
            value={quantity}
            disabled={loading || adding}
            onChange={(e) => onQuantityChange(e.target.value)}
          />
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            disabled={loading || adding || !code.trim()}
          >
            Buscar
          </Button>
        </form>
        <p className={styles.hint}>
          Leitores USB enviam o código e Enter — o foco permanece no campo para
          a próxima leitura.
        </p>
        <div className={styles.linkRow}>
          <Button variant="secondary" onClick={onGoToCart} disabled={adding}>
            Ir para o carrinho (F1)
          </Button>
        </div>
      </section>

      {message ? (
        <Alert variant={message.variant ?? 'warn'}>
          <div className={styles.statusBlock}>
            <strong>{message.title}</strong>
            {message.hint ? <span>{message.hint}</span> : null}
          </div>
        </Alert>
      ) : null}

      {product ? (
        <ProductCard
          product={product}
          quantity={quantity}
          adding={adding}
          canAdd={canAdd && product.canAdd}
          onQuantityChange={onQuantityChange}
          onAddToCart={onAddToCart}
        />
      ) : status === 'idle' && !loading ? (
        <div className={styles.emptyState}>
          <p>Aguardando leitura ou digitação do código de barras.</p>
          <p>Pressione F2 nesta tela para focar o campo de busca.</p>
        </div>
      ) : null}
    </div>
  )
}
