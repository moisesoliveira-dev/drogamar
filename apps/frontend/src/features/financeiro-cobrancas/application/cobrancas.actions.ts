import {
  assignRequest,
  cancelCaseRequest,
  cancelPromiseRequest,
  createCaseRequest,
  createPromiseRequest,
  getAgendaRequest,
  getAgingRequest,
  getCaseRequest,
  getDashboardRequest,
  getLookupsRequest,
  listCasesRequest,
  registerContactRequest,
  resolveCaseRequest,
  setNextActionRequest,
  type CobrancasFilterParams,
} from '../infrastructure/cobrancas.api'

export async function getLookupsAction() {
  return getLookupsRequest()
}

export async function getDashboardAction(period?: string) {
  return getDashboardRequest(period)
}

export async function getAgingAction() {
  return getAgingRequest()
}

export async function getAgendaAction(period?: string) {
  return getAgendaRequest(period)
}

export async function listCasesAction(params: CobrancasFilterParams) {
  return listCasesRequest(params)
}

export async function getCaseAction(id: string) {
  return getCaseRequest(id)
}

export async function createCaseAction(body: Record<string, unknown>) {
  return createCaseRequest(body)
}

export async function registerContactAction(
  id: string,
  body: Record<string, unknown>,
) {
  return registerContactRequest(id, body)
}

export async function createPromiseAction(
  id: string,
  body: Record<string, unknown>,
) {
  return createPromiseRequest(id, body)
}

export async function cancelPromiseAction(id: string, promiseId: string) {
  return cancelPromiseRequest(id, promiseId)
}

export async function assignAction(id: string, assigneeId: string | null) {
  return assignRequest(id, assigneeId)
}

export async function setNextActionAction(
  id: string,
  body: Record<string, unknown>,
) {
  return setNextActionRequest(id, body)
}

export async function cancelCaseAction(id: string, reason: string) {
  return cancelCaseRequest(id, reason)
}

export async function resolveCaseAction(
  id: string,
  body: { force?: boolean; reason?: string | null },
) {
  return resolveCaseRequest(id, body)
}
