import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert } from '../../../shared/ui/Alert'
import { getItemAction, mapItemError } from '../application/items.actions'
import { useItemPermissions } from '../application/use-item-permissions'
import { ItemDetailView } from '../components/ItemDetailView'

export function ItemDetailContainer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const permissions = useItemPermissions()

  const itemQuery = useQuery({
    queryKey: ['estoque-item', id],
    queryFn: () => getItemAction(id!),
    enabled: Boolean(id),
  })

  if (itemQuery.isLoading) {
    return <p style={{ color: 'var(--fm-muted)' }}>Carregando item…</p>
  }

  if (itemQuery.error || !itemQuery.data) {
    return (
      <Alert variant="danger">
        {itemQuery.error
          ? mapItemError(itemQuery.error)
          : 'Item não encontrado.'}
      </Alert>
    )
  }

  return (
    <ItemDetailView
      item={itemQuery.data}
      canEdit={permissions.canEdit}
      onEdit={() => navigate(`/app/estoque/itens/${id}/editar`)}
      onBack={() => navigate('/app/estoque/itens')}
    />
  )
}
