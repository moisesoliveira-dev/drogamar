import {
  cancelReceivableRequest,
  createReceivableRequest,
  getDashboardRequest,
  getLookupsRequest,
  getReceivableRequest,
  listReceivablesRequest,
  registerReceiptRequest,
  renegotiateRequest,
  reverseReceiptRequest,
  searchCustomersRequest,
  type ListReceivablesParams,
} from '../infrastructure/contas-receber.api'

export async function getLookupsAction() {
  return getLookupsRequest()
}

export async function getDashboardAction(params: ListReceivablesParams) {
  return getDashboardRequest(params)
}

export async function listReceivablesAction(params: ListReceivablesParams) {
  return listReceivablesRequest(params)
}

export async function getReceivableAction(id: string) {
  return getReceivableRequest(id)
}

export async function createReceivableAction(body: Record<string, unknown>) {
  return createReceivableRequest(body)
}

export async function registerReceiptAction(
  id: string,
  body: Record<string, unknown>,
) {
  return registerReceiptRequest(id, body)
}

export async function reverseReceiptAction(
  id: string,
  movementId: string,
  reason: string,
) {
  return reverseReceiptRequest(id, movementId, reason)
}

export async function renegotiateAction(
  id: string,
  body: Record<string, unknown>,
) {
  return renegotiateRequest(id, body)
}

export async function cancelReceivableAction(id: string, reason: string) {
  return cancelReceivableRequest(id, reason)
}

export async function searchCustomersAction(search?: string) {
  return searchCustomersRequest(search)
}
