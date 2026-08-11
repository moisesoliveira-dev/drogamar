import {
  getLotDetailRequest,
  getValidadeLookupsRequest,
  listExpiryAlertsRequest,
  type ListExpiryParams,
} from '../infrastructure/validade.api'

export async function listExpiryAlertsAction(params: ListExpiryParams) {
  return listExpiryAlertsRequest(params)
}

export async function getLotDetailAction(
  id: string,
  alertWindowDays?: number,
) {
  return getLotDetailRequest(id, alertWindowDays)
}

export async function getValidadeLookupsAction() {
  return getValidadeLookupsRequest()
}

export { mapValidadeError } from '../infrastructure/validade.api'
