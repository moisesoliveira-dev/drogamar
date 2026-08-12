import { Alert } from "../../../shared/ui/Alert";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Dialog } from "../../../shared/ui/Dialog";
import { MetricCard } from "../../../shared/ui/MetricCard";
import { Pagination } from "../../../shared/ui/Pagination";
import { SelectField } from "../../../shared/ui/SelectField";
import { Table, type TableColumn } from "../../../shared/ui/Table";
import { TextField } from "../../../shared/ui/TextField";
import { PageHeader } from "../../app-shell";
import {
  DIRECTION_LABELS,
  KIND_LABELS,
  PAGE_DESCRIPTION,
  PERIOD_OPTIONS,
  STATUS_LABELS,
  badgeVariantForDirection,
  badgeVariantForStatus,
  formatDateBR,
  formatMoney,
  type BankAccountDetail,
  type BankAccountListItem,
  type CaixaBancosDashboard,
  type CaixaBancosLookups,
  type ExtratoItem,
  type ExtratoList,
  type HistoricoList,
} from "../domain/caixa-bancos.schema";
import styles from "./CaixaBancosPage.module.css";

export type CaixaBancosPageProps = {
  items: BankAccountListItem[];
  dashboard: CaixaBancosDashboard | null;
  lookups: CaixaBancosLookups | null;
  detail: BankAccountDetail | null;
  detailLoading: boolean;
  extrato: ExtratoList | null;
  historico: HistoricoList | null;
  detailTab: "extrato" | "historico";
  loading: boolean;
  busy: boolean;
  error: string | null;
  searchDraft: string;
  filters: {
    period: string;
    from: string;
    to: string;
    kind: string;
    active: string;
  };
  createOpen: boolean;
  transferOpen: boolean;
  movementOpen: "IN" | "OUT" | null;
  adjustOpen: boolean;
  createForm: Record<string, string>;
  transferForm: Record<string, string>;
  movementForm: Record<string, string>;
  adjustForm: Record<string, string>;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canActivate: boolean;
    canTransfer: boolean;
    canEntrada: boolean;
    canSaida: boolean;
    canAdjust: boolean;
    canReverse: boolean;
    canExport: boolean;
  };
  onSearchChange: (value: string) => void;
  onFilterChange: (key: string, value: string | number) => void;
  onClearFilters: () => void;
  onSelect: (id: string) => void;
  onCloseDetail: () => void;
  onDetailTabChange: (tab: "extrato" | "historico") => void;
  onExtratoPageChange: (page: number) => void;
  onOpenCreate: () => void;
  onCloseCreate: () => void;
  onCreateFormChange: (key: string, value: string) => void;
  onSubmitCreate: () => void;
  onOpenTransfer: () => void;
  onCloseTransfer: () => void;
  onTransferFormChange: (key: string, value: string) => void;
  onSubmitTransfer: () => void;
  onOpenMovement: (direction: "IN" | "OUT") => void;
  onCloseMovement: () => void;
  onMovementFormChange: (key: string, value: string) => void;
  onSubmitMovement: () => void;
  onOpenAdjust: () => void;
  onCloseAdjust: () => void;
  onAdjustFormChange: (key: string, value: string) => void;
  onSubmitAdjust: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  onReverse: (movementId: string) => void;
  onExport: () => void;
  onRefresh: () => void;
};

export function CaixaBancosPage(props: CaixaBancosPageProps) {
  const {
    items,
    dashboard,
    lookups,
    detail,
    detailLoading,
    extrato,
    historico,
    detailTab,
    loading,
    busy,
    error,
    searchDraft,
    filters,
    createOpen,
    transferOpen,
    movementOpen,
    adjustOpen,
    createForm,
    transferForm,
    movementForm,
    adjustForm,
    permissions,
    onSearchChange,
    onFilterChange,
    onClearFilters,
    onSelect,
    onCloseDetail,
    onDetailTabChange,
    onExtratoPageChange,
    onOpenCreate,
    onCloseCreate,
    onCreateFormChange,
    onSubmitCreate,
    onOpenTransfer,
    onCloseTransfer,
    onTransferFormChange,
    onSubmitTransfer,
    onOpenMovement,
    onCloseMovement,
    onMovementFormChange,
    onSubmitMovement,
    onOpenAdjust,
    onCloseAdjust,
    onAdjustFormChange,
    onSubmitAdjust,
    onActivate,
    onDeactivate,
    onReverse,
    onExport,
    onRefresh,
  } = props;

  const tableColumns: TableColumn<BankAccountListItem>[] = [
    {
      id: "code",
      header: "Código",
      cell: (row) => row.code,
    },
    {
      id: "name",
      header: "Conta",
      cell: (row) => (
        <div className={styles.stack}>
          <strong>{row.name}</strong>
          <span className={styles.muted}>
            {row.bankName || KIND_LABELS[row.kind] || row.kind}
            {row.accountNumber ? ` · ${row.accountNumber}` : ""}
          </span>
        </div>
      ),
    },
    {
      id: "kind",
      header: "Tipo",
      cell: (row) => row.kindLabel || KIND_LABELS[row.kind] || row.kind,
    },
    {
      id: "balance",
      header: "Saldo",
      align: "right",
      cell: (row) => <strong>{formatMoney(row.balance)}</strong>,
    },
    {
      id: "period",
      header: "Período",
      align: "right",
      cell: (row) => (
        <div className={styles.stack}>
          <span className={styles.in}>+ {formatMoney(row.periodInflows)}</span>
          <span className={styles.out}>
            − {formatMoney(row.periodOutflows)}
          </span>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={row.active ? "success" : "neutral"}>
          {row.active ? "Ativa" : "Inativa"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Ações",
      cell: (row) => (
        <Button variant="ghost" onClick={() => onSelect(row.id)}>
          Detalhes
        </Button>
      ),
    },
  ];

  const extratoColumns: TableColumn<ExtratoItem>[] = [
    {
      id: "occurredAt",
      header: "Data",
      cell: (row) => formatDateBR(row.occurredAt),
    },
    {
      id: "description",
      header: "Descrição",
      cell: (row) => (
        <div className={styles.stack}>
          <span>{row.description}</span>
          <span className={styles.muted}>{row.number}</span>
        </div>
      ),
    },
    {
      id: "direction",
      header: "Tipo",
      cell: (row) => (
        <Badge variant={badgeVariantForDirection(row.direction)}>
          {row.status === "REVERSED"
            ? "Estornado"
            : DIRECTION_LABELS[row.direction] || row.direction}
        </Badge>
      ),
    },
    {
      id: "amount",
      header: "Valor",
      align: "right",
      cell: (row) => formatMoney(row.amount),
    },
    {
      id: "running",
      header: "Saldo",
      align: "right",
      cell: (row) => formatMoney(row.runningBalance),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant={badgeVariantForStatus(row.status)}>
          {STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        permissions.canReverse && row.status === "REALIZED" ? (
          <Button
            variant="ghost"
            onClick={() => onReverse(row.id)}
            disabled={busy}
          >
            Estornar
          </Button>
        ) : null,
    },
  ];

  const kindOptions = [
    { value: "ALL", label: "Todos" },
    ...(lookups?.kinds.map((k) => ({ value: k.value, label: k.label })) ??
      Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))),
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        breadcrumbs={[
          { label: "Financeiro", path: "/app/financeiro/caixa-bancos" },
          { label: "F4 — Caixa e Bancos" },
        ]}
        title="Caixa e Bancos"
        description={PAGE_DESCRIPTION}
        actions={
          <>
            {permissions.canExport ? (
              <Button variant="secondary" onClick={onExport} disabled={busy}>
                Exportar
              </Button>
            ) : null}
            <Button variant="secondary" onClick={onRefresh} disabled={busy}>
              Atualizar
            </Button>
            {permissions.canTransfer ? (
              <Button
                variant="secondary"
                onClick={onOpenTransfer}
                disabled={busy}
              >
                Transferência
              </Button>
            ) : null}
            {permissions.canCreate ? (
              <Button onClick={onOpenCreate} disabled={busy}>
                + Nova conta
              </Button>
            ) : null}
          </>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <section className={styles.metrics} aria-label="Resumo">
        <MetricCard
          label="Saldo total"
          value={formatMoney(dashboard?.totalBalance ?? 0)}
        />
        <MetricCard
          label="Entradas"
          value={formatMoney(dashboard?.periodInflows ?? 0)}
          tone="success"
        />
        <MetricCard
          label="Saídas"
          value={formatMoney(dashboard?.periodOutflows ?? 0)}
          tone="danger"
        />
        <MetricCard
          label="Resultado"
          value={formatMoney(dashboard?.result ?? 0)}
          tone="info"
        />
        <MetricCard
          label="Contas ativas"
          value={String(dashboard?.activeAccountsCount ?? 0)}
        />
      </section>

      <section className={styles.filters} aria-label="Filtros">
        <TextField
          label="Buscar"
          value={searchDraft}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Código, nome, banco ou conta..."
        />
        <SelectField
          label="Período"
          value={filters.period}
          onChange={(e) => onFilterChange("period", e.target.value)}
          options={[...PERIOD_OPTIONS]}
        />
        {filters.period === "CUSTOM" ? (
          <>
            <TextField
              label="De"
              type="date"
              value={filters.from}
              onChange={(e) => onFilterChange("from", e.target.value)}
            />
            <TextField
              label="Até"
              type="date"
              value={filters.to}
              onChange={(e) => onFilterChange("to", e.target.value)}
            />
          </>
        ) : null}
        <SelectField
          label="Tipo"
          value={filters.kind}
          onChange={(e) => onFilterChange("kind", e.target.value)}
          options={kindOptions}
        />
        <SelectField
          label="Status"
          value={filters.active}
          onChange={(e) => onFilterChange("active", e.target.value)}
          options={[
            { value: "ALL", label: "Todas" },
            { value: "true", label: "Ativas" },
            { value: "false", label: "Inativas" },
          ]}
        />
        <div className={styles.filterActions}>
          <Button variant="secondary" onClick={onClearFilters}>
            Limpar
          </Button>
        </div>
      </section>

      <div className={detail ? styles.layoutWithDetail : styles.layout}>
        <div className={styles.main}>
          {loading ? (
            <div className={styles.muted}>Carregando contas...</div>
          ) : items.length === 0 ? (
            <div className={styles.emptyState}>
              <h2>Nenhuma conta cadastrada</h2>
              <p className={styles.muted}>
                Cadastre o caixa geral e contas bancárias para controlar saldos
                e movimentações.
              </p>
              {permissions.canCreate ? (
                <Button onClick={onOpenCreate}>+ Nova conta</Button>
              ) : null}
            </div>
          ) : (
            <>
              <div className={styles.cards}>
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.accountCard} ${
                      detail?.id === item.id ? styles.accountCardActive : ""
                    }`}
                    onClick={() => onSelect(item.id)}
                  >
                    <header>
                      <div>
                        <h3>{item.name}</h3>
                        <div className={styles.accountMeta}>
                          {item.code} ·{" "}
                          {item.kindLabel ||
                            KIND_LABELS[item.kind] ||
                            item.kind}
                        </div>
                      </div>
                      <Badge variant={item.active ? "success" : "neutral"}>
                        {item.active ? "Ativa" : "Inativa"}
                      </Badge>
                    </header>
                    <div className={styles.balance}>
                      {formatMoney(item.balance)}
                    </div>
                    <div className={styles.periodRow}>
                      <span className={styles.in}>
                        + {formatMoney(item.periodInflows)}
                      </span>
                      <span className={styles.out}>
                        − {formatMoney(item.periodOutflows)}
                      </span>
                    </div>
                    <div className={styles.accountMeta}>
                      {item.accountNumber
                        ? `Conta ${item.accountNumber}`
                        : item.bankName || "Sem dados bancários"}
                      {item.lastMovementAt
                        ? ` · Último mov. ${formatDateBR(item.lastMovementAt)}`
                        : ""}
                    </div>
                  </button>
                ))}
              </div>

              <div className={styles.desktopTable}>
                <Table
                  columns={tableColumns}
                  rows={items}
                  rowKey={(r) => r.id}
                />
              </div>
              <div className={styles.mobileList}>
                {items.map((item) => (
                  <button
                    key={`m-${item.id}`}
                    type="button"
                    className={styles.accountCard}
                    onClick={() => onSelect(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span>{formatMoney(item.balance)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {detail || detailLoading ? (
          <aside className={styles.detail} aria-label="Detalhe da conta">
            {detailLoading && !detail ? (
              <div className={styles.muted}>Carregando detalhe...</div>
            ) : detail ? (
              <>
                <div className={styles.detailHeader}>
                  <div>
                    <h2>{detail.name}</h2>
                    <div className={styles.muted}>
                      {detail.code} ·{" "}
                      {detail.kindLabel ||
                        KIND_LABELS[detail.kind] ||
                        detail.kind}
                    </div>
                  </div>
                  <Button variant="ghost" onClick={onCloseDetail}>
                    Fechar
                  </Button>
                </div>

                <dl className={styles.facts}>
                  <div>
                    <dt>Saldo</dt>
                    <dd>
                      <strong>{formatMoney(detail.balance)}</strong>
                    </dd>
                  </div>
                  <div>
                    <dt>Entradas</dt>
                    <dd className={styles.in}>
                      {formatMoney(detail.periodInflows)}
                    </dd>
                  </div>
                  <div>
                    <dt>Saídas</dt>
                    <dd className={styles.out}>
                      {formatMoney(detail.periodOutflows)}
                    </dd>
                  </div>
                  <div>
                    <dt>Banco</dt>
                    <dd>{detail.bankName || "—"}</dd>
                  </div>
                  <div>
                    <dt>Agência</dt>
                    <dd>{detail.agency || "—"}</dd>
                  </div>
                  <div>
                    <dt>Conta</dt>
                    <dd>
                      {detail.accountNumber || "—"}
                      {detail.accountDigit ? `-${detail.accountDigit}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt>Status</dt>
                    <dd>{detail.active ? "Ativa" : "Inativa"}</dd>
                  </div>
                </dl>

                <div className={styles.detailActions}>
                  {permissions.canEntrada && detail.active ? (
                    <Button
                      variant="secondary"
                      onClick={() => onOpenMovement("IN")}
                      disabled={busy}
                    >
                      Entrada
                    </Button>
                  ) : null}
                  {permissions.canSaida && detail.active ? (
                    <Button
                      variant="secondary"
                      onClick={() => onOpenMovement("OUT")}
                      disabled={busy}
                    >
                      Saída
                    </Button>
                  ) : null}
                  {permissions.canAdjust && detail.active ? (
                    <Button
                      variant="secondary"
                      onClick={onOpenAdjust}
                      disabled={busy}
                    >
                      Ajustar saldo
                    </Button>
                  ) : null}
                  {permissions.canActivate ? (
                    detail.active ? (
                      <Button
                        variant="secondary"
                        onClick={onDeactivate}
                        disabled={busy}
                      >
                        Inativar
                      </Button>
                    ) : (
                      <Button onClick={onActivate} disabled={busy}>
                        Ativar
                      </Button>
                    )
                  ) : null}
                </div>

                <div className={styles.tabs}>
                  <Button
                    variant={detailTab === "extrato" ? "primary" : "secondary"}
                    onClick={() => onDetailTabChange("extrato")}
                  >
                    Extrato
                  </Button>
                  <Button
                    variant={
                      detailTab === "historico" ? "primary" : "secondary"
                    }
                    onClick={() => onDetailTabChange("historico")}
                  >
                    Histórico
                  </Button>
                </div>

                {detailTab === "extrato" ? (
                  <>
                    <h3>Extrato</h3>
                    {(extrato?.items.length ?? 0) === 0 ? (
                      <div className={styles.muted}>
                        Sem movimentações no período.
                      </div>
                    ) : (
                      <>
                        <Table
                          columns={extratoColumns}
                          rows={extrato?.items ?? []}
                          rowKey={(r) => r.id}
                        />
                        <Pagination
                          page={extrato?.page ?? 1}
                          totalPages={extrato?.totalPages ?? 1}
                          total={extrato?.total ?? 0}
                          pageSize={extrato?.pageSize ?? 20}
                          onPageChange={onExtratoPageChange}
                        />
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <h3>Histórico</h3>
                    <ul className={styles.simpleList}>
                      {(historico?.items ?? []).map((item) => (
                        <li key={item.id}>
                          <div className={styles.stack}>
                            <strong>{item.action}</strong>
                            <span className={styles.muted}>
                              {item.actorName} ·{" "}
                              {new Date(item.createdAt).toLocaleString("pt-BR")}
                              {item.movementNumber
                                ? ` · ${item.movementNumber}`
                                : ""}
                            </span>
                            {item.message ? <span>{item.message}</span> : null}
                          </div>
                          <span>
                            {item.amount != null
                              ? formatMoney(item.amount)
                              : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : null}
          </aside>
        ) : null}
      </div>

      <Dialog
        open={createOpen}
        onClose={onCloseCreate}
        title="Nova conta"
        footer={
          <>
            <Button variant="secondary" onClick={onCloseCreate} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={onSubmitCreate} disabled={busy}>
              Salvar
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <TextField
            label="Nome"
            value={createForm.name}
            onChange={(e) => onCreateFormChange("name", e.target.value)}
            className={styles.formGridFull}
          />
          <SelectField
            label="Tipo"
            value={createForm.kind}
            onChange={(e) => onCreateFormChange("kind", e.target.value)}
            options={kindOptions.filter((o) => o.value !== "ALL")}
          />
          <TextField
            label="Código (opcional)"
            value={createForm.code}
            onChange={(e) => onCreateFormChange("code", e.target.value)}
            placeholder="Gerado automaticamente"
          />
          <TextField
            label="Banco"
            value={createForm.bankName}
            onChange={(e) => onCreateFormChange("bankName", e.target.value)}
          />
          <TextField
            label="Agência"
            value={createForm.agency}
            onChange={(e) => onCreateFormChange("agency", e.target.value)}
          />
          <TextField
            label="Conta"
            value={createForm.accountNumber}
            onChange={(e) =>
              onCreateFormChange("accountNumber", e.target.value)
            }
          />
          <TextField
            label="Dígito"
            value={createForm.accountDigit}
            onChange={(e) => onCreateFormChange("accountDigit", e.target.value)}
          />
          <TextField
            label="Saldo inicial"
            type="number"
            value={createForm.openingBalance}
            onChange={(e) =>
              onCreateFormChange("openingBalance", e.target.value)
            }
          />
          <TextField
            label="Data do saldo"
            type="date"
            value={createForm.openingBalanceDate}
            onChange={(e) =>
              onCreateFormChange("openingBalanceDate", e.target.value)
            }
          />
          <TextField
            label="Observações"
            value={createForm.notes}
            onChange={(e) => onCreateFormChange("notes", e.target.value)}
            className={styles.formGridFull}
          />
        </div>
      </Dialog>

      <Dialog
        open={transferOpen}
        onClose={onCloseTransfer}
        title="Transferência"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={onCloseTransfer}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={onSubmitTransfer} disabled={busy}>
              Transferir
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <SelectField
            label="Origem"
            value={transferForm.fromBankAccountId}
            onChange={(e) =>
              onTransferFormChange("fromBankAccountId", e.target.value)
            }
            options={[
              { value: "", label: "Selecione..." },
              ...(lookups?.bankAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
              })) ?? []),
            ]}
          />
          <SelectField
            label="Destino"
            value={transferForm.toBankAccountId}
            onChange={(e) =>
              onTransferFormChange("toBankAccountId", e.target.value)
            }
            options={[
              { value: "", label: "Selecione..." },
              ...(lookups?.bankAccounts.map((a) => ({
                value: a.id,
                label: `${a.code} — ${a.name}`,
              })) ?? []),
            ]}
          />
          <TextField
            label="Valor"
            type="number"
            value={transferForm.amount}
            onChange={(e) => onTransferFormChange("amount", e.target.value)}
          />
          <TextField
            label="Data"
            type="date"
            value={transferForm.occurredAt}
            onChange={(e) => onTransferFormChange("occurredAt", e.target.value)}
          />
          <TextField
            label="Descrição"
            value={transferForm.description}
            onChange={(e) =>
              onTransferFormChange("description", e.target.value)
            }
            className={styles.formGridFull}
          />
        </div>
      </Dialog>

      <Dialog
        open={movementOpen != null}
        onClose={onCloseMovement}
        title={movementOpen === "IN" ? "Entrada" : "Saída"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={onCloseMovement}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button onClick={onSubmitMovement} disabled={busy}>
              Confirmar
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <TextField
            label="Valor"
            type="number"
            value={movementForm.amount}
            onChange={(e) => onMovementFormChange("amount", e.target.value)}
          />
          <TextField
            label="Data"
            type="date"
            value={movementForm.occurredAt}
            onChange={(e) => onMovementFormChange("occurredAt", e.target.value)}
          />
          <TextField
            label="Descrição"
            value={movementForm.description}
            onChange={(e) =>
              onMovementFormChange("description", e.target.value)
            }
            className={styles.formGridFull}
          />
          <SelectField
            label="Categoria"
            value={movementForm.categoryId}
            onChange={(e) => onMovementFormChange("categoryId", e.target.value)}
            options={[
              { value: "", label: "Opcional" },
              ...(lookups?.categories.map((c) => ({
                value: c.id,
                label: c.name,
              })) ?? []),
            ]}
          />
          <SelectField
            label="Centro de custo"
            value={movementForm.costCenterId}
            onChange={(e) =>
              onMovementFormChange("costCenterId", e.target.value)
            }
            options={[
              { value: "", label: "Opcional" },
              ...(lookups?.costCenters.map((c) => ({
                value: c.id,
                label: c.name,
              })) ?? []),
            ]}
          />
        </div>
      </Dialog>

      <Dialog
        open={adjustOpen}
        onClose={onCloseAdjust}
        title="Ajustar saldo"
        footer={
          <>
            <Button variant="secondary" onClick={onCloseAdjust} disabled={busy}>
              Cancelar
            </Button>
            <Button onClick={onSubmitAdjust} disabled={busy}>
              Ajustar
            </Button>
          </>
        }
      >
        <div className={styles.formGrid}>
          <TextField
            label="Saldo atual"
            value={formatMoney(detail?.balance ?? 0)}
            disabled
          />
          <TextField
            label="Saldo alvo"
            type="number"
            value={adjustForm.targetBalance}
            onChange={(e) =>
              onAdjustFormChange("targetBalance", e.target.value)
            }
          />
          <TextField
            label="Data"
            type="date"
            value={adjustForm.occurredAt}
            onChange={(e) => onAdjustFormChange("occurredAt", e.target.value)}
          />
          <TextField
            label="Motivo"
            value={adjustForm.reason}
            onChange={(e) => onAdjustFormChange("reason", e.target.value)}
            className={styles.formGridFull}
          />
        </div>
      </Dialog>
    </div>
  );
}
