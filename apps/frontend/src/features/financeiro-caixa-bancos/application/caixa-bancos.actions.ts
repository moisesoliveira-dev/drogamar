import {
  activateAccountRequest,
  adjustBalanceRequest,
  createAccountRequest,
  createEntradaRequest,
  createSaidaRequest,
  createTransferRequest,
  deactivateAccountRequest,
  getAccountRequest,
  getDashboardRequest,
  getExtratoRequest,
  getHistoricoRequest,
  getLookupsRequest,
  listAccountsRequest,
  reverseMovementRequest,
  updateAccountRequest,
  type CaixaBancosFilterParams,
} from "../infrastructure/caixa-bancos.api";

export async function getLookupsAction() {
  return getLookupsRequest();
}

export async function getDashboardAction(params: CaixaBancosFilterParams) {
  return getDashboardRequest(params);
}

export async function listAccountsAction(params: CaixaBancosFilterParams) {
  return listAccountsRequest(params);
}

export async function getAccountAction(
  id: string,
  params?: CaixaBancosFilterParams,
) {
  return getAccountRequest(id, params);
}

export async function getExtratoAction(
  id: string,
  params: CaixaBancosFilterParams,
) {
  return getExtratoRequest(id, params);
}

export async function getHistoricoAction(id: string) {
  return getHistoricoRequest(id);
}

export async function createAccountAction(body: Record<string, unknown>) {
  return createAccountRequest(body);
}

export async function updateAccountAction(
  id: string,
  body: Record<string, unknown>,
) {
  return updateAccountRequest(id, body);
}

export async function activateAccountAction(id: string) {
  return activateAccountRequest(id);
}

export async function deactivateAccountAction(id: string) {
  return deactivateAccountRequest(id);
}

export async function createEntradaAction(
  id: string,
  body: Record<string, unknown>,
) {
  return createEntradaRequest(id, body);
}

export async function createSaidaAction(
  id: string,
  body: Record<string, unknown>,
) {
  return createSaidaRequest(id, body);
}

export async function createTransferAction(body: Record<string, unknown>) {
  return createTransferRequest(body);
}

export async function adjustBalanceAction(
  id: string,
  body: Record<string, unknown>,
) {
  return adjustBalanceRequest(id, body);
}

export async function reverseMovementAction(
  movementId: string,
  reason: string,
) {
  return reverseMovementRequest(movementId, reason);
}
