import { Badge } from '../../../shared/ui/Badge'
import { Button } from '../../../shared/ui/Button'
import { PageHeader } from '../../app-shell'
import type { StockItem } from '../domain/item.schema'
import styles from './ItemDetailView.module.css'

export type ItemDetailViewProps = {
  item: StockItem
  canEdit: boolean
  onEdit: () => void
  onBack: () => void
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className={styles.fieldLabel}>{label}</span>
      <p className={styles.fieldValue}>{value || '—'}</p>
    </div>
  )
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function ItemDetailView({
  item,
  canEdit,
  onEdit,
  onBack,
}: ItemDetailViewProps) {
  return (
    <div className={styles.view}>
      <PageHeader
        breadcrumbs={[
          { label: 'Estoque', path: '/app/estoque/itens' },
          { label: 'Cadastro de Itens', path: '/app/estoque/itens' },
          { label: item.code },
        ]}
        title={item.description}
        description={`Código ${item.code}`}
        actions={
          <>
            <Button type="button" variant="ghost" onClick={onBack}>
              Voltar
            </Button>
            {canEdit ? (
              <Button type="button" onClick={onEdit}>
                Editar
              </Button>
            ) : null}
          </>
        }
      />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Identificação</h2>
        <div className={styles.grid}>
          <Field label="Código" value={item.code} />
          <div>
            <span className={styles.fieldLabel}>Status</span>
            <p className={styles.fieldValue}>
              {item.status === 'ACTIVE' ? (
                <Badge variant="success">Ativo</Badge>
              ) : (
                <Badge variant="neutral">Inativo</Badge>
              )}
            </p>
          </div>
          <Field label="Descrição" value={item.description} />
          <Field label="SKU" value={item.sku ?? '—'} />
          <Field label="Código de barras" value={item.barcode ?? '—'} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Classificação</h2>
        <div className={styles.grid}>
          <Field label="Categoria" value={item.categoryName ?? '—'} />
          <Field label="Marca" value={item.brandName ?? '—'} />
          <Field label="Tipo" value={item.itemType} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Unidade</h2>
        <div className={styles.grid}>
          <Field
            label="Unidade de medida"
            value={
              item.measureUnitCode
                ? `${item.measureUnitCode}${item.measureUnitLabel ? ` — ${item.measureUnitLabel}` : ''}`
                : '—'
            }
          />
          <Field label="Unidade de compra" value={item.purchaseUnitCode ?? '—'} />
          <Field label="Unidade de venda" value={item.saleUnitCode ?? '—'} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Estoque</h2>
        <div className={styles.grid}>
          <Field
            label="Controlar estoque"
            value={item.trackStock ? 'Sim' : 'Não'}
          />
          <Field label="Estoque atual" value={String(item.currentStock)} />
          <Field
            label="Estoque mínimo"
            value={item.minStock != null ? String(item.minStock) : '—'}
          />
          <Field
            label="Estoque máximo"
            value={item.maxStock != null ? String(item.maxStock) : '—'}
          />
          <Field label="Localização" value={item.locationName ?? '—'} />
          <Field label="Controlar lote" value={item.trackLot ? 'Sim' : 'Não'} />
          <Field
            label="Controlar validade"
            value={item.trackExpiry ? 'Sim' : 'Não'}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Comercial</h2>
        <div className={styles.grid}>
          <Field
            label="Preço de custo"
            value={item.costPrice != null ? String(item.costPrice) : '—'}
          />
          <Field
            label="Preço de venda"
            value={item.salePrice != null ? String(item.salePrice) : '—'}
          />
          <Field
            label="Margem"
            value={
              item.marginPercent != null ? `${item.marginPercent}%` : '—'
            }
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Fiscal</h2>
        <div className={styles.grid}>
          <Field label="NCM" value={item.ncm ?? '—'} />
          <Field label="CEST" value={item.cest ?? '—'} />
          <Field label="Origem" value={item.origin ?? '—'} />
          <Field label="CFOP" value={item.defaultCfop ?? '—'} />
          <Field label="Unidade fiscal" value={item.fiscalUnit ?? '—'} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Adicionais</h2>
        <div className={styles.grid}>
          <Field
            label="Descrição complementar"
            value={item.complementaryDescription ?? '—'}
          />
          <Field label="Observações" value={item.notes ?? '—'} />
          <Field label="Fabricante" value={item.manufacturer ?? '—'} />
          <Field label="Fornecedor principal" value={item.mainSupplier ?? '—'} />
          <Field label="Criado em" value={formatDate(item.createdAt)} />
          <Field label="Atualizado em" value={formatDate(item.updatedAt)} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Histórico de alterações</h2>
        <p className={styles.history}>
          Espaço preparado para auditoria detalhada. Eventos de criação,
          alteração, desativação e exclusão já são publicados no backend.
        </p>
      </section>
    </div>
  )
}
