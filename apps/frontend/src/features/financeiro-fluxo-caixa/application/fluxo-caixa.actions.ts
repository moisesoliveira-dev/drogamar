import {
  cancelMovementRequest,
  createMovementRequest,
  createTransferRequest,
  getAnalysisRequest,
  getBalancesRequest,
  getDashboardRequest,
  getLookupsRequest,
  getMovementRequest,
  getProjectionRequest,
  getSeriesRequest,
  listMovementsRequest,
  reverseMovementRequest,
  type FluxoCaixaFilterParams,
} from '../infrastructure/fluxo-caixa.api'

export async function getLookupsAction() {
  return getLookupsRequest()
}

export async function getDashboardAction(params: FluxoCaixaFilterParams) {
  return getDashboardRequest(params)
}

export async function getSeriesAction(params: FluxoCaixaFilterParams) {
  return getSeriesRequest(params)
}

export async function getProjectionAction(params: FluxoCaixaFilterParams) {
  return getProjectionRequest(params)
}

export async function listMovementsAction(params: FluxoCaixaFilterParams) {
  return listMovementsRequest(params)
}

export async function getMovementAction(id: string) {
  return getMovementRequest(id)
}

export async function getAnalysisAction(params: FluxoCaixaFilterParams) {
  return getAnalysisRequest(params)
}

export async function getBalancesAction(params: FluxoCaixaFilterParams) {
  return getBalancesRequest(params)
}

export async function createMovementAction(body: Record<string, unknown>) {
  return createMovementRequest(body)
}

export async function createTransferAction(body: Record<string, unknown>) {
  return createTransferRequest(body)
}

export async function cancelMovementAction(id: string, reason: string) {
  return cancelMovementRequest(id, reason)
}

export async function reverseMovementAction(id: string, reason: string) {
  return reverseMovementRequest(id, reason)
}
