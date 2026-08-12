import { Alert } from '../../../shared/ui/Alert'
import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { SparkleIcon } from '../../../shared/ui/icons'
import { TextField } from '../../../shared/ui/TextField'
import { PageHeader } from '../../app-shell'
import { formatMoney } from '../../vendas-carrinho'
import {
  vendasBuscaIaConfig,
  type BuscaIaItem,
  type BuscaIaResult,
  type BuscaIaUiState,
} from '../domain/busca-ia.schema'
import styles from './BuscaIaPage.module.css'

export type BuscaIaPageProps = {
  draft: string
  state: BuscaIaUiState
  result: BuscaIaResult | null
  error: string | null
  llmAvailable: boolean
  busy: boolean
  addingId: string | null
  onDraftChange: (value: string) => void
  onSearch: () => void
  onExample: (value: string) => void
  onAdd: (item: BuscaIaItem) => void
  onTraditional: () => void
  onBalcao: () => void
}

function FilterChips({ result }: { result: BuscaIaResult }) {
  const chips: string[] = []
  const i = result.interpreted
  if (i.search) chips.push(`texto: ${i.search}`)
  if (i.categoryName) chips.push(`categoria: ${i.categoryName}`)
  if (i.brandName) chips.push(`marca: ${i.brandName}`)
  if (i.priceMax != null) chips.push(`até ${formatMoney(i.priceMax)}`)
  if (i.priceMin != null) chips.push(`desde ${formatMoney(i.priceMin)}`)
  if (i.inStock) chips.push('em estoque')
  if (chips.length === 0) return null
  return (
    <div className={styles.filters}>
      {chips.map((chip) => (
        <Badge key={chip} variant="neutral">
          {chip}
        </Badge>
      ))}
      <Badge variant="info">{result.source === 'llm' ? 'IA' : 'Local'}</Badge>
    </div>
  )
}

export function BuscaIaPage({
  draft,
  state,
  result,
  error,
  llmAvailable,
  busy,
  addingId,
  onDraftChange,
  onSearch,
  onExample,
  onAdd,
  onTraditional,
  onBalcao,
}: BuscaIaPageProps) {
  return (
    <div className={styles.page}>
      <PageHeader
        title="Busca por IA"
        breadcrumbs={[
          { label: 'Vendas', path: '/app/vendas/balcao' },
          { label: 'F5 — Busca por IA' },
        ]}
        description="Linguagem natural para localizar produtos reais. A IA não altera preço, estoque nem a venda."
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}
      {!llmAvailable ? (
        <Alert variant="warn" role="status">
          Serviço de IA indisponível. A busca usa interpretação local e o
          catálogo do sistema.
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
            label="Buscar produtos com IA"
            placeholder="Buscar produtos com IA..."
            value={draft}
            leadingIcon={<SparkleIcon size={16} />}
            autoComplete="off"
            disabled={busy}
            onChange={(e) => onDraftChange(e.target.value)}
          />
          <Button type="submit" variant="primary" loading={busy}>
            Buscar
          </Button>
          <Button type="button" variant="secondary" onClick={onTraditional}>
            Buscar normalmente
          </Button>
        </form>
        <p className={styles.hint}>Exemplos</p>
        <div className={styles.examples}>
          {vendasBuscaIaConfig.examples.map((example) => (
            <button
              key={example}
              type="button"
              className={styles.example}
              onClick={() => onExample(example)}
            >
              {example}
            </button>
          ))}
        </div>
        <Button variant="ghost" onClick={onBalcao}>
          Voltar ao balcão (F4)
        </Button>
      </section>

      {state === 'loading' ? (
        <Alert variant="warn" role="status">
          Processando sua pergunta…
        </Alert>
      ) : null}

      {result ? (
        <>
          <Alert variant={result.total === 0 ? 'warn' : 'success'} role="status">
            {result.message}
          </Alert>
          <FilterChips result={result} />
          {result.items.length === 0 ? (
            <div className={styles.empty}>
              <p className={styles.hint}>
                Tente outra pergunta ou use a busca tradicional por código,
                nome ou código de barras.
              </p>
            </div>
          ) : (
            <div className={styles.grid}>
              {result.items.map((item) => (
                <article key={item.id} className={styles.card}>
                  <div className={styles.image}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" />
                    ) : (
                      <span>Sem imagem</span>
                    )}
                  </div>
                  <h3>{item.description}</h3>
                  <p className={styles.meta}>
                    {item.code}
                    {item.sku ? ` · SKU ${item.sku}` : ''}
                  </p>
                  <p className={styles.meta}>
                    {item.categoryName ?? 'Sem categoria'} ·{' '}
                    {item.brandName ?? 'Sem marca'}
                  </p>
                  <p className={styles.price}>{formatMoney(item.salePrice)}</p>
                  <p className={styles.meta}>
                    Estoque:{' '}
                    {item.trackStock
                      ? item.currentStock.toLocaleString('pt-BR')
                      : 'Não controlado'}
                  </p>
                  <div className={styles.actions}>
                    {item.outOfStock ? (
                      <Badge variant="danger">Sem estoque</Badge>
                    ) : null}
                    <Button
                      variant="primary"
                      disabled={!item.canAdd || busy}
                      loading={addingId === item.id}
                      onClick={() => onAdd(item)}
                    >
                      Adicionar ao carrinho
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : state === 'idle' ? (
        <div className={styles.empty}>
          <p className={styles.hint}>
            Pergunte em linguagem natural. Só produtos cadastrados aparecem
            aqui.
          </p>
        </div>
      ) : null}
    </div>
  )
}
