import {
  ItemConflictError,
  ItemNetworkError,
  ItemNotFoundError,
  ItemServiceError,
  ItemValidationError,
} from '../domain/errors'
import {
  formToPayload,
  stockItemFormSchema,
  type StockItemFormInput,
} from '../domain/item.schema'
import {
  activateItemRequest,
  createItemRequest,
  deactivateItemRequest,
  deleteItemRequest,
  duplicateItemRequest,
  getItemRequest,
  getLookupsRequest,
  listItemsRequest,
  updateItemRequest,
  type ListItemsParams,
} from '../infrastructure/itens.api'

export function mapItemError(error: unknown): string {
  if (error instanceof ItemConflictError) return error.message
  if (error instanceof ItemValidationError) return error.message
  if (error instanceof ItemNotFoundError) return 'Item não encontrado.'
  if (error instanceof ItemNetworkError) {
    return 'Falha de conexão. Verifique sua rede e tente novamente.'
  }
  if (error instanceof ItemServiceError) return error.message
  return 'Não foi possível concluir a operação.'
}

export async function listItemsAction(params: ListItemsParams) {
  return listItemsRequest(params)
}

export async function getItemAction(id: string) {
  return getItemRequest(id)
}

export async function getLookupsAction() {
  return getLookupsRequest()
}

export async function createItemAction(input: StockItemFormInput) {
  const parsed = stockItemFormSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new ItemValidationError(first?.message ?? 'Dados inválidos.')
  }
  return createItemRequest(formToPayload(parsed.data))
}

export async function updateItemAction(id: string, input: StockItemFormInput) {
  const parsed = stockItemFormSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    throw new ItemValidationError(first?.message ?? 'Dados inválidos.')
  }
  return updateItemRequest(id, formToPayload(parsed.data))
}

export async function duplicateItemAction(id: string) {
  return duplicateItemRequest(id)
}

export async function deactivateItemAction(id: string) {
  return deactivateItemRequest(id)
}

export async function activateItemAction(id: string) {
  return activateItemRequest(id)
}

export async function deleteItemAction(id: string) {
  return deleteItemRequest(id)
}
