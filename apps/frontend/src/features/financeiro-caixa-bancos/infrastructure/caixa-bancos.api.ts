import { apiFetch, HttpNetworkError } from "../../../shared/lib/http";
import {
  CaixaBancosNetworkError,
  CaixaBancosServiceError,
} from "../domain/errors";
import {
  accountDetailSchema,
  accountListSchema,
  caixaBancosConfig,
  dashboardSchema,
  extratoSchema,
  historicoSchema,
  lookupsSchema,
  type BankAccountDetail,
  type CaixaBancosDashboard,
  type CaixaBancosLookups,
  type ExtratoList,
  type HistoricoList,
} from "../domain/caixa-bancos.schema";

async function mapError(response: Response): Promise<never> {
  let message: string | undefined;
  let code: string | undefined;
  try {
    const body = (await response.json()) as { code?: string; message?: string };
    code = body.code;
    message = body.message;
  } catch {
    // ignore
  }
  throw new CaixaBancosServiceError(
    message ?? "Não foi possível concluir a operação.",
    code,
  );
}

async function request(path: string, init?: RequestInit) {
  try {
    return await apiFetch(path, init);
  } catch (error) {
    if (error instanceof HttpNetworkError) throw new CaixaBancosNetworkError();
    throw error;
  }
}

function toQuery(
  params: Record<string, string | number | boolean | undefined>,
) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === "" || value === "ALL") return;
    q.set(key, String(value));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

export type CaixaBancosFilterParams = {
  period?: string;
  from?: string;
  to?: string;
  search?: string;
  kind?: string;
  active?: string;
  revealSensitive?: boolean;
  page?: number;
  pageSize?: number;
  direction?: string;
  status?: string;
};

export async function getLookupsRequest(): Promise<CaixaBancosLookups> {
  const response = await request(caixaBancosConfig.lookupsPath);
  if (!response.ok) await mapError(response);
  return lookupsSchema.parse(await response.json());
}

export async function getDashboardRequest(
  params: CaixaBancosFilterParams,
): Promise<CaixaBancosDashboard> {
  const response = await request(
    `${caixaBancosConfig.dashboardPath}${toQuery(params)}`,
  );
  if (!response.ok) await mapError(response);
  return dashboardSchema.parse(await response.json());
}

export async function listAccountsRequest(params: CaixaBancosFilterParams) {
  const response = await request(
    `${caixaBancosConfig.listPath}${toQuery(params)}`,
  );
  if (!response.ok) await mapError(response);
  return accountListSchema.parse(await response.json());
}

export async function getAccountRequest(
  id: string,
  params: CaixaBancosFilterParams = {},
): Promise<BankAccountDetail> {
  const response = await request(
    `${caixaBancosConfig.itemPath(id)}${toQuery({
      period: params.period,
      from: params.from,
      to: params.to,
      reveal: params.revealSensitive ? "1" : undefined,
    })}`,
  );
  if (!response.ok) await mapError(response);
  return accountDetailSchema.parse(await response.json());
}

export async function getExtratoRequest(
  id: string,
  params: CaixaBancosFilterParams,
): Promise<ExtratoList> {
  const response = await request(
    `${caixaBancosConfig.extratoPath(id)}${toQuery(params)}`,
  );
  if (!response.ok) await mapError(response);
  return extratoSchema.parse(await response.json());
}

export async function getHistoricoRequest(id: string): Promise<HistoricoList> {
  const response = await request(caixaBancosConfig.historicoPath(id));
  if (!response.ok) await mapError(response);
  return historicoSchema.parse(await response.json());
}

export async function createAccountRequest(body: Record<string, unknown>) {
  const response = await request(caixaBancosConfig.listPath, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) await mapError(response);
  return accountDetailSchema.parse(await response.json());
}

export async function updateAccountRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(caixaBancosConfig.itemPath(id), {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!response.ok) await mapError(response);
  return accountDetailSchema.parse(await response.json());
}

export async function activateAccountRequest(id: string) {
  const response = await request(caixaBancosConfig.activatePath(id), {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!response.ok) await mapError(response);
  return accountDetailSchema.parse(await response.json());
}

export async function deactivateAccountRequest(id: string) {
  const response = await request(caixaBancosConfig.deactivatePath(id), {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!response.ok) await mapError(response);
  return accountDetailSchema.parse(await response.json());
}

export async function createEntradaRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(caixaBancosConfig.entradaPath(id), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) await mapError(response);
  return response.json();
}

export async function createSaidaRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(caixaBancosConfig.saidaPath(id), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) await mapError(response);
  return response.json();
}

export async function createTransferRequest(body: Record<string, unknown>) {
  const response = await request(caixaBancosConfig.transferPath, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) await mapError(response);
  return response.json();
}

export async function adjustBalanceRequest(
  id: string,
  body: Record<string, unknown>,
) {
  const response = await request(caixaBancosConfig.adjustPath(id), {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!response.ok) await mapError(response);
  return response.json();
}

export async function reverseMovementRequest(
  movementId: string,
  reason: string,
) {
  const response = await request(caixaBancosConfig.reversePath(movementId), {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) await mapError(response);
  return response.json();
}
