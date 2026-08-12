import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  activateAccountAction,
  adjustBalanceAction,
  createAccountAction,
  createEntradaAction,
  createSaidaAction,
  createTransferAction,
  deactivateAccountAction,
  getAccountAction,
  getDashboardAction,
  getExtratoAction,
  getHistoricoAction,
  getLookupsAction,
  listAccountsAction,
  reverseMovementAction,
} from "../application/caixa-bancos.actions";
import { useCaixaBancosPermissions } from "../application/use-caixa-bancos-permissions";
import { CaixaBancosPage } from "../components/CaixaBancosPage";
import { mapCaixaBancosError } from "../domain/errors";
import { useCaixaBancosStore } from "../stores/caixa-bancos.store";

const LIST_KEY = ["financeiro-caixa-bancos"] as const;

const today = () => new Date().toISOString().slice(0, 10);

export function CaixaBancosContainer() {
  const queryClient = useQueryClient();
  const permissions = useCaixaBancosPermissions();
  const store = useCaixaBancosStore();
  const [searchDraft, setSearchDraft] = useState(store.search);
  const [error, setError] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<"extrato" | "historico">(
    "extrato",
  );
  const [extratoPage, setExtratoPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState<"IN" | "OUT" | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    kind: "CHECKING",
    bankName: "",
    agency: "",
    accountNumber: "",
    accountDigit: "",
    notes: "",
    openingBalance: "",
    openingBalanceDate: today(),
  });
  const [transferForm, setTransferForm] = useState({
    amount: "",
    occurredAt: today(),
    fromBankAccountId: "",
    toBankAccountId: "",
    description: "",
  });
  const [movementForm, setMovementForm] = useState({
    amount: "",
    occurredAt: today(),
    description: "",
    categoryId: "",
    costCenterId: "",
  });
  const [adjustForm, setAdjustForm] = useState({
    targetBalance: "",
    occurredAt: today(),
    reason: "",
  });

  useEffect(() => {
    const handle = window.setTimeout(() => store.setSearch(searchDraft), 300);
    return () => window.clearTimeout(handle);
  }, [searchDraft, store]);

  const filters = {
    search: store.search || undefined,
    period: store.period,
    from: store.from || undefined,
    to: store.to || undefined,
    kind: store.kind,
    active: store.active,
  };

  const lookupsQuery = useQuery({
    queryKey: [...LIST_KEY, "lookups"],
    queryFn: getLookupsAction,
    staleTime: 60_000,
  });

  const dashboardQuery = useQuery({
    queryKey: [...LIST_KEY, "dashboard", filters],
    queryFn: () => getDashboardAction(filters),
  });

  const listQuery = useQuery({
    queryKey: [...LIST_KEY, "list", filters],
    queryFn: () => listAccountsAction(filters),
  });

  const detailQuery = useQuery({
    queryKey: [...LIST_KEY, "detail", store.selectedId, filters],
    queryFn: () =>
      getAccountAction(store.selectedId!, {
        period: filters.period,
        from: filters.from,
        to: filters.to,
        revealSensitive: false,
      }),
    enabled: Boolean(store.selectedId),
  });

  const extratoQuery = useQuery({
    queryKey: [...LIST_KEY, "extrato", store.selectedId, filters, extratoPage],
    queryFn: () =>
      getExtratoAction(store.selectedId!, {
        period: filters.period,
        from: filters.from,
        to: filters.to,
        page: extratoPage,
        pageSize: 20,
        status: "ALL",
      }),
    enabled: Boolean(store.selectedId) && detailTab === "extrato",
  });

  const historicoQuery = useQuery({
    queryKey: [...LIST_KEY, "historico", store.selectedId],
    queryFn: () => getHistoricoAction(store.selectedId!),
    enabled: Boolean(store.selectedId) && detailTab === "historico",
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: LIST_KEY });
  };

  const createMutation = useMutation({
    mutationFn: createAccountAction,
    onSuccess: async (detail) => {
      setError(null);
      setCreateOpen(false);
      setExtratoPage(1);
      setDetailTab("extrato");
      store.setSelectedId(detail.id);
      await invalidate();
    },
    onError: (e) => setError(mapCaixaBancosError(e)),
  });

  const transferMutation = useMutation({
    mutationFn: createTransferAction,
    onSuccess: async () => {
      setError(null);
      setTransferOpen(false);
      await invalidate();
    },
    onError: (e) => setError(mapCaixaBancosError(e)),
  });

  const movementMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => {
      if (!store.selectedId || !movementOpen) {
        return Promise.reject(new Error("Conta não selecionada."));
      }
      return movementOpen === "IN"
        ? createEntradaAction(store.selectedId, body)
        : createSaidaAction(store.selectedId, body);
    },
    onSuccess: async () => {
      setError(null);
      setMovementOpen(null);
      await invalidate();
    },
    onError: (e) => setError(mapCaixaBancosError(e)),
  });

  const adjustMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      adjustBalanceAction(store.selectedId!, body),
    onSuccess: async () => {
      setError(null);
      setAdjustOpen(false);
      await invalidate();
    },
    onError: (e) => setError(mapCaixaBancosError(e)),
  });

  const activateMutation = useMutation({
    mutationFn: () => activateAccountAction(store.selectedId!),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (e) => setError(mapCaixaBancosError(e)),
  });

  const deactivateMutation = useMutation({
    mutationFn: () => deactivateAccountAction(store.selectedId!),
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (e) => setError(mapCaixaBancosError(e)),
  });

  const reverseMutation = useMutation({
    mutationFn: (movementId: string) => {
      const reason = window.prompt("Motivo do estorno:");
      if (!reason?.trim()) {
        return Promise.reject(new Error("Informe o motivo do estorno."));
      }
      return reverseMovementAction(movementId, reason.trim());
    },
    onSuccess: async () => {
      setError(null);
      await invalidate();
    },
    onError: (e) => setError(mapCaixaBancosError(e)),
  });

  const busy =
    createMutation.isPending ||
    transferMutation.isPending ||
    movementMutation.isPending ||
    adjustMutation.isPending ||
    activateMutation.isPending ||
    deactivateMutation.isPending ||
    reverseMutation.isPending;

  return (
    <CaixaBancosPage
      items={listQuery.data?.items ?? []}
      dashboard={dashboardQuery.data ?? null}
      lookups={lookupsQuery.data ?? null}
      detail={detailQuery.data ?? null}
      detailLoading={detailQuery.isLoading}
      extrato={extratoQuery.data ?? null}
      historico={historicoQuery.data ?? null}
      detailTab={detailTab}
      loading={listQuery.isLoading}
      busy={busy}
      error={
        error ??
        (listQuery.error
          ? mapCaixaBancosError(listQuery.error)
          : dashboardQuery.error
            ? mapCaixaBancosError(dashboardQuery.error)
            : null)
      }
      searchDraft={searchDraft}
      filters={{
        period: store.period,
        from: store.from,
        to: store.to,
        kind: store.kind,
        active: store.active,
      }}
      createOpen={createOpen}
      transferOpen={transferOpen}
      movementOpen={movementOpen}
      adjustOpen={adjustOpen}
      createForm={createForm}
      transferForm={transferForm}
      movementForm={movementForm}
      adjustForm={adjustForm}
      permissions={permissions}
      onSearchChange={setSearchDraft}
      onFilterChange={(key, value) => store.setFilter(key, value)}
      onClearFilters={() => {
        store.clearFilters();
        setSearchDraft("");
      }}
      onSelect={(id) => {
        setExtratoPage(1);
        setDetailTab("extrato");
        store.setSelectedId(id);
      }}
      onCloseDetail={() => store.setSelectedId(null)}
      onDetailTabChange={setDetailTab}
      onExtratoPageChange={setExtratoPage}
      onOpenCreate={() => {
        setCreateForm({
          name: "",
          code: "",
          kind: "CHECKING",
          bankName: "",
          agency: "",
          accountNumber: "",
          accountDigit: "",
          notes: "",
          openingBalance: "",
          openingBalanceDate: today(),
        });
        setCreateOpen(true);
      }}
      onCloseCreate={() => setCreateOpen(false)}
      onCreateFormChange={(key, value) =>
        setCreateForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitCreate={() => {
        createMutation.mutate({
          name: createForm.name,
          code: createForm.code || null,
          kind: createForm.kind,
          bankName: createForm.bankName || null,
          agency: createForm.agency || null,
          accountNumber: createForm.accountNumber || null,
          accountDigit: createForm.accountDigit || null,
          notes: createForm.notes || null,
          openingBalance: createForm.openingBalance
            ? Number(createForm.openingBalance)
            : 0,
          openingBalanceDate: createForm.openingBalanceDate || today(),
        });
      }}
      onOpenTransfer={() => {
        setTransferForm({
          amount: "",
          occurredAt: today(),
          fromBankAccountId: store.selectedId || "",
          toBankAccountId: "",
          description: "",
        });
        setTransferOpen(true);
      }}
      onCloseTransfer={() => setTransferOpen(false)}
      onTransferFormChange={(key, value) =>
        setTransferForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitTransfer={() => {
        transferMutation.mutate({
          amount: Number(transferForm.amount),
          occurredAt: transferForm.occurredAt,
          fromBankAccountId: transferForm.fromBankAccountId,
          toBankAccountId: transferForm.toBankAccountId,
          description: transferForm.description || null,
        });
      }}
      onOpenMovement={(direction) => {
        setMovementForm({
          amount: "",
          occurredAt: today(),
          description: "",
          categoryId: "",
          costCenterId: "",
        });
        setMovementOpen(direction);
      }}
      onCloseMovement={() => setMovementOpen(null)}
      onMovementFormChange={(key, value) =>
        setMovementForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitMovement={() => {
        movementMutation.mutate({
          amount: Number(movementForm.amount),
          occurredAt: movementForm.occurredAt,
          description: movementForm.description,
          categoryId: movementForm.categoryId || null,
          costCenterId: movementForm.costCenterId || null,
        });
      }}
      onOpenAdjust={() => {
        setAdjustForm({
          targetBalance: String(detailQuery.data?.balance ?? ""),
          occurredAt: today(),
          reason: "",
        });
        setAdjustOpen(true);
      }}
      onCloseAdjust={() => setAdjustOpen(false)}
      onAdjustFormChange={(key, value) =>
        setAdjustForm((prev) => ({ ...prev, [key]: value }))
      }
      onSubmitAdjust={() => {
        adjustMutation.mutate({
          targetBalance: Number(adjustForm.targetBalance),
          occurredAt: adjustForm.occurredAt,
          reason: adjustForm.reason,
        });
      }}
      onActivate={() => activateMutation.mutate()}
      onDeactivate={() => {
        if (window.confirm("Inativar esta conta?")) {
          deactivateMutation.mutate();
        }
      }}
      onReverse={(movementId) => reverseMutation.mutate(movementId)}
      onExport={() =>
        setError("Exportação de Caixa e Bancos será disponibilizada em breve.")
      }
      onRefresh={() => {
        void invalidate();
      }}
    />
  );
}
