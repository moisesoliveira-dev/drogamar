import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../../../shared/ui/Alert'
import { PageHeader } from '../../app-shell'
import {
  createItemAction,
  getItemAction,
  getLookupsAction,
  mapItemError,
  updateItemAction,
} from '../application/items.actions'
import { ItemForm } from '../components/ItemForm'
import { ItemConflictError } from '../domain/errors'
import {
  emptyStockItemForm,
  stockItemToForm,
  type StockItemFormInput,
  type StockLookups,
} from '../domain/item.schema'

function ItemFormEditor({
  mode,
  itemId,
  initial,
  lookups,
}: {
  mode: 'create' | 'edit'
  itemId?: string
  initial: StockItemFormInput
  lookups: StockLookups
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [value, setValue] = useState(initial)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof StockItemFormInput, string>>
  >({})
  const [success, setSuccess] = useState<string | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (intent: 'save' | 'save-and-new') => {
      setFormError(null)
      setFieldErrors({})
      setSuccess(null)
      if (mode === 'create') {
        const created = await createItemAction(value)
        return { intent, item: created }
      }
      const updated = await updateItemAction(itemId!, value)
      return { intent, item: updated }
    },
    onSuccess: ({ intent, item }) => {
      void queryClient.invalidateQueries({ queryKey: ['estoque-itens'] })
      void queryClient.invalidateQueries({ queryKey: ['estoque-item', item.id] })
      if (intent === 'save-and-new') {
        setValue(emptyStockItemForm())
        setSuccess('Item salvo. Você pode cadastrar outro.')
        return
      }
      navigate(`/app/estoque/itens/${item.id}`)
    },
    onError: (error) => {
      if (error instanceof ItemConflictError) {
        if (error.code === 'DUPLICATE_CODE') {
          setFieldErrors({ code: error.message })
        } else if (error.code === 'DUPLICATE_SKU') {
          setFieldErrors({ sku: error.message })
        } else if (error.code === 'DUPLICATE_BARCODE') {
          setFieldErrors({ barcode: error.message })
        }
      }
      setFormError(mapItemError(error))
    },
  })

  return (
    <div>
      <PageHeader
        breadcrumbs={[
          { label: 'Estoque', path: '/app/estoque/itens' },
          { label: 'Cadastro de Itens', path: '/app/estoque/itens' },
          { label: mode === 'create' ? 'Novo item' : 'Editar' },
        ]}
        title={mode === 'create' ? 'Novo item' : 'Editar item'}
        description="Preencha as seções abaixo. Campos fiscais e mídia estão preparados para evolução."
      />
      {success ? (
        <div style={{ marginBottom: 12 }}>
          <Alert variant="success" role="status">
            {success}
          </Alert>
        </div>
      ) : null}
      <ItemForm
        mode={mode}
        value={value}
        lookups={lookups}
        saving={saveMutation.isPending}
        formError={formError}
        fieldErrors={fieldErrors}
        onChange={(patch) => setValue((prev) => ({ ...prev, ...patch }))}
        onSubmit={(intent) => saveMutation.mutate(intent)}
        onCancel={() => navigate('/app/estoque/itens')}
      />
    </div>
  )
}

export function ItemFormContainer({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()

  const lookupsQuery = useQuery({
    queryKey: ['estoque-lookups'],
    queryFn: getLookupsAction,
  })

  const itemQuery = useQuery({
    queryKey: ['estoque-item', id],
    queryFn: () => getItemAction(id!),
    enabled: mode === 'edit' && Boolean(id),
  })

  if (mode === 'edit' && itemQuery.isLoading) {
    return <p style={{ color: 'var(--fm-muted)' }}>Carregando item…</p>
  }

  if (mode === 'edit' && itemQuery.error) {
    return <Alert variant="danger">{mapItemError(itemQuery.error)}</Alert>
  }

  if (!lookupsQuery.data) {
    return <p style={{ color: 'var(--fm-muted)' }}>Carregando formulário…</p>
  }

  if (mode === 'edit' && !itemQuery.data) {
    return <Alert variant="danger">Item não encontrado.</Alert>
  }

  const initial =
    mode === 'edit' && itemQuery.data
      ? stockItemToForm(itemQuery.data)
      : emptyStockItemForm()

  return (
    <ItemFormEditor
      key={mode === 'edit' ? itemQuery.data!.id : 'create'}
      mode={mode}
      itemId={id}
      initial={initial}
      lookups={lookupsQuery.data}
    />
  )
}
