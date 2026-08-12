import {
  getBuscaIaStatusRequest,
  searchBuscaIaRequest,
} from '../infrastructure/busca-ia.api'

export async function getBuscaIaStatusAction() {
  return getBuscaIaStatusRequest()
}

export async function searchBuscaIaAction(query: string, page = 1) {
  return searchBuscaIaRequest({ query, page })
}
