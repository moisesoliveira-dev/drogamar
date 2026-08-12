import { z } from "zod";

export const caixaBancosConfig = {
  basePath: "/api/financeiro/caixa-bancos",
  lookupsPath: "/api/financeiro/caixa-bancos/lookups",
  dashboardPath: "/api/financeiro/caixa-bancos/dashboard",
  listPath: "/api/financeiro/caixa-bancos",
  itemPath: (id: string) => `/api/financeiro/caixa-bancos/${id}`,
  activatePath: (id: string) => `/api/financeiro/caixa-bancos/${id}/ativar`,
  deactivatePath: (id: string) => `/api/financeiro/caixa-bancos/${id}/inativar`,
  extratoPath: (id: string) => `/api/financeiro/caixa-bancos/${id}/extrato`,
  historicoPath: (id: string) => `/api/financeiro/caixa-bancos/${id}/historico`,
  entradaPath: (id: string) => `/api/financeiro/caixa-bancos/${id}/entradas`,
  saidaPath: (id: string) => `/api/financeiro/caixa-bancos/${id}/saidas`,
  adjustPath: (id: string) =>
    `/api/financeiro/caixa-bancos/${id}/ajustar-saldo`,
  transferPath: "/api/financeiro/caixa-bancos/transferencias",
  reversePath: (movementId: string) =>
    `/api/financeiro/caixa-bancos/movimentos/${movementId}/estornar`,
} as const;

export const PAGE_DESCRIPTION =
  'Gerencie caixas, contas bancárias, saldos e movimentações financeiras.'

export const KIND_LABELS: Record<string, string> = {
  CASH: "Caixa",
  CHECKING: "Conta corrente",
  SAVINGS: "Poupança",
  PAYMENT: "Conta pagamento",
  BANK: "Banco",
  OTHER: "Outro",
};

export const PERIOD_OPTIONS = [
  { value: "TODAY", label: "Hoje" },
  { value: "LAST_7", label: "Últimos 7 dias" },
  { value: "MONTH", label: "Mês atual" },
  { value: "PREV_MONTH", label: "Mês anterior" },
  { value: "YEAR", label: "Ano" },
  { value: "CUSTOM", label: "Personalizado" },
] as const;

export const DIRECTION_LABELS: Record<string, string> = {
  IN: "Entrada",
  OUT: "Saída",
};

export const STATUS_LABELS: Record<string, string> = {
  REALIZED: "Realizada",
  REVERSED: "Estornada",
  CANCELLED: "Cancelada",
};

export function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDateBR(value: string | null | undefined) {
  if (!value) return "—";
  const [y, m, d] = value.slice(0, 10).split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}

export function badgeVariantForStatus(status: string) {
  if (status === "REALIZED") return "success" as const;
  if (status === "REVERSED") return "warn" as const;
  if (status === "CANCELLED") return "neutral" as const;
  return "info" as const;
}

export function badgeVariantForDirection(direction: string) {
  return direction === "IN" ? ("success" as const) : ("danger" as const);
}

const accountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  bankName: z.string().nullable().optional(),
  kind: z.string(),
  kindLabel: z.string().optional(),
  agency: z.string().nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountDigit: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  active: z.boolean(),
  balance: z.number(),
  periodInflows: z.number(),
  periodOutflows: z.number(),
  result: z.number().optional(),
  lastMovementAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  sensitiveRevealed: z.boolean().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const lookupsSchema = z.object({
  kinds: z.array(z.object({ value: z.string(), label: z.string() })),
  categories: z.array(
    z.object({ id: z.string(), code: z.string(), name: z.string() }),
  ),
  costCenters: z.array(
    z.object({ id: z.string(), code: z.string(), name: z.string() }),
  ),
  bankAccounts: z.array(
    z.object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      kind: z.string().optional(),
      bankName: z.string().nullable().optional(),
    }),
  ),
});

export const dashboardSchema = z.object({
  from: z.string(),
  to: z.string(),
  totalBalance: z.number(),
  periodInflows: z.number(),
  periodOutflows: z.number(),
  result: z.number(),
  activeAccountsCount: z.number(),
});

export const accountListSchema = z.object({
  from: z.string(),
  to: z.string(),
  items: z.array(accountSchema),
  total: z.number(),
});

export const accountDetailSchema = accountSchema;

const movementItemSchema = z.object({
  id: z.string(),
  sequentialId: z.number().optional(),
  number: z.string(),
  direction: z.string(),
  kind: z.string(),
  status: z.string(),
  amount: z.number(),
  occurredAt: z.string(),
  description: z.string(),
  origin: z.string().optional(),
  notes: z.string().nullable().optional(),
  runningBalance: z.number().nullable().optional(),
  category: z
    .object({ id: z.string(), code: z.string(), name: z.string() })
    .nullable()
    .optional(),
  operatorName: z.string().optional(),
});

export const extratoSchema = z.object({
  items: z.array(movementItemSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  totalPages: z.number(),
});

export const historicoSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      action: z.string(),
      amount: z.number().nullable(),
      message: z.string().nullable().optional(),
      createdAt: z.string(),
      actorName: z.string(),
      movementId: z.string().nullable().optional(),
      movementNumber: z.string().nullable().optional(),
    }),
  ),
});

export type BankAccountListItem = z.infer<typeof accountSchema>;
export type BankAccountDetail = z.infer<typeof accountDetailSchema>;
export type CaixaBancosLookups = z.infer<typeof lookupsSchema>;
export type CaixaBancosDashboard = z.infer<typeof dashboardSchema>;
export type ExtratoList = z.infer<typeof extratoSchema>;
export type HistoricoList = z.infer<typeof historicoSchema>;
export type ExtratoItem = z.infer<typeof movementItemSchema>;
