import { Button } from '../../../shared/ui/Button'
import { SelectField } from '../../../shared/ui/SelectField'
import { Switch } from '../../../shared/ui/Switch'
import { TextField } from '../../../shared/ui/TextField'
import { Alert } from '../../../shared/ui/Alert'
import type { StockItemFormInput, StockLookups } from '../domain/item.schema'
import styles from './ItemForm.module.css'

export type ItemFormProps = {
  mode: 'create' | 'edit'
  value: StockItemFormInput
  lookups: StockLookups
  saving?: boolean
  formError?: string | null
  fieldErrors?: Partial<Record<keyof StockItemFormInput, string>>
  onChange: (patch: Partial<StockItemFormInput>) => void
  onSubmit: (intent: 'save' | 'save-and-new') => void
  onCancel: () => void
}

function numValue(v: number | null | undefined | string): string {
  if (v == null || v === '') return ''
  return String(v)
}

function parseNum(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

function marginOf(
  cost: number | null | undefined | string,
  sale: number | null | undefined | string,
): string {
  const c = typeof cost === 'number' ? cost : cost ? Number(cost) : null
  const s = typeof sale === 'number' ? sale : sale ? Number(sale) : null
  if (c == null || s == null || c <= 0 || Number.isNaN(c) || Number.isNaN(s)) {
    return '—'
  }
  return `${(((s - c) / c) * 100).toFixed(2)}%`
}

export function ItemForm({
  mode,
  value,
  lookups,
  saving,
  formError,
  fieldErrors = {},
  onChange,
  onSubmit,
  onCancel,
}: ItemFormProps) {
  const unitOptions = lookups.units.map((u) => ({
    value: u.id,
    label: u.label,
  }))

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit('save')
      }}
    >
      {formError ? <Alert variant="danger">{formError}</Alert> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Identificação</h2>
        <div className={styles.grid}>
          <TextField
            label="Código interno"
            value={value.code ?? ''}
            onChange={(e) => onChange({ code: e.target.value })}
            hint={
              mode === 'create'
                ? 'Deixe em branco para gerar automaticamente (ITM-######).'
                : undefined
            }
            error={fieldErrors.code}
            disabled={saving}
          />
          <SelectField
            label="Status"
            value={value.status ?? 'ACTIVE'}
            onChange={(e) =>
              onChange({ status: e.target.value as 'ACTIVE' | 'INACTIVE' })
            }
            options={[
              { value: 'ACTIVE', label: 'Ativo' },
              { value: 'INACTIVE', label: 'Inativo' },
            ]}
            emptyLabel="—"
            disabled={saving}
          />
          <div className={styles.full}>
            <TextField
              label="Descrição"
              value={value.description}
              onChange={(e) => onChange({ description: e.target.value })}
              error={fieldErrors.description}
              required
              disabled={saving}
            />
          </div>
          <TextField
            label="SKU"
            value={value.sku ?? ''}
            onChange={(e) => onChange({ sku: e.target.value })}
            error={fieldErrors.sku}
            disabled={saving}
          />
          <TextField
            label="Código de barras"
            value={value.barcode ?? ''}
            onChange={(e) => onChange({ barcode: e.target.value })}
            error={fieldErrors.barcode}
            disabled={saving}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Classificação</h2>
        <div className={styles.grid}>
          <SelectField
            label="Categoria"
            value={value.categoryId ?? ''}
            onChange={(e) => onChange({ categoryId: e.target.value })}
            options={lookups.categories.map((c) => ({
              value: c.id,
              label: c.label,
            }))}
            disabled={saving}
          />
          <SelectField
            label="Marca"
            value={value.brandId ?? ''}
            onChange={(e) => onChange({ brandId: e.target.value })}
            options={lookups.brands.map((b) => ({
              value: b.id,
              label: b.label,
            }))}
            disabled={saving}
          />
          <SelectField
            label="Tipo do item"
            value={value.itemType ?? 'PRODUCT'}
            onChange={(e) =>
              onChange({
                itemType: e.target.value as StockItemFormInput['itemType'],
              })
            }
            options={lookups.itemTypes.map((t) => ({
              value: t.id,
              label: t.label,
            }))}
            emptyLabel="—"
            disabled={saving}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Unidade e movimentação</h2>
        <div className={styles.grid3}>
          <SelectField
            label="Unidade de medida"
            value={value.measureUnitId ?? ''}
            onChange={(e) => onChange({ measureUnitId: e.target.value })}
            options={unitOptions}
            disabled={saving}
          />
          <SelectField
            label="Unidade de compra"
            value={value.purchaseUnitId ?? ''}
            onChange={(e) => onChange({ purchaseUnitId: e.target.value })}
            options={unitOptions}
            disabled={saving}
          />
          <SelectField
            label="Unidade de venda"
            value={value.saleUnitId ?? ''}
            onChange={(e) => onChange({ saleUnitId: e.target.value })}
            options={unitOptions}
            disabled={saving}
          />
          <TextField
            label="Fator compra → medida"
            type="number"
            inputMode="decimal"
            value={numValue(value.purchaseToMeasureFactor)}
            onChange={(e) =>
              onChange({ purchaseToMeasureFactor: parseNum(e.target.value) })
            }
            hint="Opcional — preparação para conversão."
            disabled={saving}
          />
          <TextField
            label="Fator venda → medida"
            type="number"
            inputMode="decimal"
            value={numValue(value.saleToMeasureFactor)}
            onChange={(e) =>
              onChange({ saleToMeasureFactor: parseNum(e.target.value) })
            }
            disabled={saving}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Controle de estoque</h2>
        <div className={styles.grid}>
          <div className={styles.full}>
            <Switch
              label="Controlar estoque"
              description="Ativa controle de quantidades mínimas/máximas."
              checked={Boolean(value.trackStock)}
              onCheckedChange={(trackStock) => onChange({ trackStock })}
              disabled={saving}
            />
          </div>
          {value.trackStock ? (
            <>
              <TextField
                label="Estoque mínimo"
                type="number"
                value={numValue(value.minStock)}
                onChange={(e) =>
                  onChange({ minStock: parseNum(e.target.value) })
                }
                error={fieldErrors.minStock}
                disabled={saving}
              />
              <TextField
                label="Estoque máximo"
                type="number"
                value={numValue(value.maxStock)}
                onChange={(e) =>
                  onChange({ maxStock: parseNum(e.target.value) })
                }
                disabled={saving}
              />
              {mode === 'create' ? (
                <TextField
                  label="Estoque inicial"
                  type="number"
                  value={numValue(value.initialStock)}
                  onChange={(e) =>
                    onChange({ initialStock: parseNum(e.target.value) })
                  }
                  disabled={saving}
                />
              ) : null}
              <SelectField
                label="Localização"
                value={value.locationId ?? ''}
                onChange={(e) => onChange({ locationId: e.target.value })}
                options={lookups.locations.map((l) => ({
                  value: l.id,
                  label: l.label,
                }))}
                disabled={saving}
              />
            </>
          ) : null}
          <Switch
            label="Controlar lote"
            checked={Boolean(value.trackLot)}
            onCheckedChange={(trackLot) => onChange({ trackLot })}
            disabled={saving}
          />
          <Switch
            label="Controlar validade"
            description="Prepara o item para F2 — Alerta de Validade."
            checked={Boolean(value.trackExpiry)}
            onCheckedChange={(trackExpiry) => onChange({ trackExpiry })}
            disabled={saving}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Informações comerciais</h2>
        <div className={styles.grid3}>
          <TextField
            label="Preço de custo"
            type="number"
            inputMode="decimal"
            value={numValue(value.costPrice)}
            onChange={(e) => onChange({ costPrice: parseNum(e.target.value) })}
            disabled={saving}
          />
          <TextField
            label="Preço de venda"
            type="number"
            inputMode="decimal"
            value={numValue(value.salePrice)}
            onChange={(e) => onChange({ salePrice: parseNum(e.target.value) })}
            disabled={saving}
          />
          <div className={styles.margin}>
            <span className={styles.marginLabel}>Margem</span>
            <div className={styles.marginValue}>
              {marginOf(value.costPrice, value.salePrice)}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Informações fiscais</h2>
        <p className={styles.hintBox}>
          Campos preparatórios. Regras tributárias serão definidas em módulo
          fiscal dedicado.
        </p>
        <div className={styles.grid3} style={{ marginTop: 12 }}>
          <TextField
            label="NCM"
            value={value.ncm ?? ''}
            onChange={(e) => onChange({ ncm: e.target.value })}
            disabled={saving}
          />
          <TextField
            label="CEST"
            value={value.cest ?? ''}
            onChange={(e) => onChange({ cest: e.target.value })}
            disabled={saving}
          />
          <TextField
            label="Origem"
            value={value.origin ?? ''}
            onChange={(e) => onChange({ origin: e.target.value })}
            disabled={saving}
          />
          <TextField
            label="CFOP padrão"
            value={value.defaultCfop ?? ''}
            onChange={(e) => onChange({ defaultCfop: e.target.value })}
            disabled={saving}
          />
          <TextField
            label="Unidade fiscal"
            value={value.fiscalUnit ?? ''}
            onChange={(e) => onChange({ fiscalUnit: e.target.value })}
            disabled={saving}
          />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Informações adicionais</h2>
        <div className={styles.grid}>
          <div className={styles.full}>
            <TextField
              label="Descrição complementar"
              value={value.complementaryDescription ?? ''}
              onChange={(e) =>
                onChange({ complementaryDescription: e.target.value })
              }
              disabled={saving}
            />
          </div>
          <div className={styles.full}>
            <TextField
              label="Observações"
              value={value.notes ?? ''}
              onChange={(e) => onChange({ notes: e.target.value })}
              disabled={saving}
            />
          </div>
          <TextField
            label="Fabricante"
            value={value.manufacturer ?? ''}
            onChange={(e) => onChange({ manufacturer: e.target.value })}
            disabled={saving}
          />
          <TextField
            label="Fornecedor principal"
            value={value.mainSupplier ?? ''}
            onChange={(e) => onChange({ mainSupplier: e.target.value })}
            disabled={saving}
          />
          <div className={styles.full}>
            <div className={styles.hintBox}>
              Imagem e anexos serão habilitados em uma próxima entrega (upload
              com preview).
            </div>
          </div>
        </div>
      </section>

      <div className={styles.footer}>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        {mode === 'create' ? (
          <Button
            type="button"
            variant="secondary"
            loading={saving}
            onClick={() => onSubmit('save-and-new')}
          >
            Salvar e criar outro
          </Button>
        ) : null}
        <Button type="submit" loading={saving}>
          Salvar
        </Button>
      </div>
    </form>
  )
}
