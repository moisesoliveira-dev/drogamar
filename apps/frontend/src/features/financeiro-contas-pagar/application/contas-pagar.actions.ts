import {
  approvePayableRequest,
  cancelPayableRequest,
  createPayableRequest,
  getDashboardRequest,
  getLookupsRequest,
  getPayableRequest,
  listPayablesRequest,
  registerPaymentRequest,
  rejectPayableRequest,
  renegotiateRequest,
  requestApprovalRequest,
  reversePaymentRequest,
  schedulePaymentRequest,
  searchSuppliersRequest,
  type ListPayablesParams,
} from '../infrastructure/contas-pagar.api'

export async function getLookupsAction() {
  return getLookupsRequest()
}

export async function getDashboardAction(params: ListPayablesParams) {
  return getDashboardRequest(params)
}

export async function listPayablesAction(params: ListPayablesParams) {
  return listPayablesRequest(params)
}

export async function getPayableAction(id: string) {
  return getPayableRequest(id)
}

export async function createPayableAction(body: Record<string, unknown>) {
  return createPayableRequest(body)
}

export async function registerPaymentAction(
  id: string,
  body: Record<string, unknown>,
) {
  return registerPaymentRequest(id, body)
}

export async function reversePaymentAction(
  id: string,
  movementId: string,
  reason: string,
) {
  return reversePaymentRequest(id, movementId, reason)
}

export async function renegotiateAction(
  id: string,
  body: Record<string, unknown>,
) {
  return renegotiateRequest(id, body)
}

export async function cancelPayableAction(id: string, reason: string) {
  return cancelPayableRequest(id, reason)
}

export async function schedulePaymentAction(
  id: string,
  body: Record<string, unknown>,
) {
  return schedulePaymentRequest(id, body)
}

export async function requestApprovalAction(
  id: string,
  reason?: string | null,
) {
  return requestApprovalRequest(id, reason)
}

export async function approvePayableAction(
  id: string,
  reason?: string | null,
) {
  return approvePayableRequest(id, reason)
}

export async function rejectPayableAction(id: string, reason: string) {
  return rejectPayableRequest(id, reason)
}

export async function searchSuppliersAction(search?: string) {
  return searchSuppliersRequest(search)
}
