import { Injectable } from '@nestjs/common';
import type {
  CollectionCaseStatus,
  CollectionContactChannel,
  CollectionContactOutcome,
  CollectionNextAction,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { computePriorityScore } from '../../domain/collection/collection-priority';
import {
  CollectionNotFoundError,
  CollectionValidationError,
} from '../../domain/collection/errors';
import {
  calculateReceivableMoney,
  daysOverdue,
  resolveDisplayStatus,
  toUtcDateOnly,
} from '../../domain/receivable/receivable-money';
import { ContasReceberService } from './contas-receber.service';
import { CollectionSyncService } from './collection-sync.service';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

const CHANNEL_LABELS: Record<CollectionContactChannel, string> = {
  PHONE: 'Telefone',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  SMS: 'SMS',
  IN_PERSON: 'Presencial',
  OTHER: 'Outro',
};

const OUTCOME_LABELS: Record<CollectionContactOutcome, string> = {
  NO_ANSWER: 'Não atendeu',
  ANSWERED: 'Atendeu',
  REQUESTED_DEADLINE: 'Pediu prazo',
  DISPUTED: 'Contestou',
  PROMISED_PAYMENT: 'Prometeu pagamento',
  PAID: 'Já pagou',
  INVALID_NUMBER: 'Número inválido',
  INVALID_EMAIL: 'E-mail inválido',
  OTHER: 'Outro',
};

const STATUS_LABELS: Record<CollectionCaseStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  CONTACTED: 'Contatado',
  PROMISED: 'Com promessa',
  RESOLVED: 'Resolvido',
  NO_RESPONSE: 'Sem resposta',
  CANCELLED: 'Cancelado',
};

const NEXT_ACTION_LABELS: Record<CollectionNextAction, string> = {
  CALL: 'Ligar',
  WHATSAPP: 'WhatsApp',
  EMAIL: 'E-mail',
  WAIT_PAYMENT: 'Aguardar pagamento',
  CHECK_PROMISE: 'Verificar promessa',
  NEGOTIATE: 'Negociar',
  CLOSE: 'Encerrar',
  OTHER: 'Outro',
};

const OPEN_STATUSES: CollectionCaseStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'CONTACTED',
  'PROMISED',
  'NO_RESPONSE',
];

export type ListCollectionFilters = {
  search?: string;
  status?: string;
  financialStatus?: string;
  customerId?: string;
  daysBucket?: string;
  amountMin?: number;
  amountMax?: number;
  assigneeId?: string;
  period?: string;
  page?: number;
  pageSize?: number;
};

@Injectable()
export class CobrancasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: CollectionSyncService,
    private readonly contasReceber: ContasReceberService,
  ) {}

  getLookups() {
    return this.prisma.user
      .findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      })
      .then((assignees) => ({
        channels: Object.entries(CHANNEL_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        outcomes: Object.entries(OUTCOME_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        statuses: Object.entries(STATUS_LABELS).map(([value, label]) => ({
          value,
          label,
        })),
        nextActions: Object.entries(NEXT_ACTION_LABELS).map(
          ([value, label]) => ({
            value,
            label,
          }),
        ),
        assignees,
        messagingConfigured: false,
        messagingMessage: 'Canal não configurado',
      }));
  }

  async dashboard(period = 'MONTH') {
    const { from, to } = this.resolvePeriodBounds(period);
    const today = toUtcDateOnly(new Date());

    const openReceivables = await this.prisma.accountReceivable.findMany({
      where: { status: { in: ['OPEN', 'PARTIAL'] } },
    });

    let totalOverdue = 0;
    const delinquentCustomerIds = new Set<string>();
    for (const row of openReceivables) {
      const money = this.moneyForRow(row);
      const display = resolveDisplayStatus({
        status: row.status,
        dueDate: row.dueDate,
        balance: money.balance,
        today,
      });
      if (display === 'OVERDUE' && money.balance > 0.0001) {
        totalOverdue += money.balance;
        delinquentCustomerIds.add(row.customerId);
      }
    }

    const pendingCollections = await this.prisma.collectionCase.count({
      where: { status: { in: OPEN_STATUSES } },
    });

    const activePromises = await this.prisma.paymentPromise.count({
      where: { status: { in: ['PENDING', 'OVERDUE'] } },
    });

    const collectionReceivableIds = (
      await this.prisma.collectionItem.findMany({
        select: { receivableId: true },
        distinct: ['receivableId'],
      })
    ).map((i) => i.receivableId);

    let recoveredViaCollections = 0;
    if (collectionReceivableIds.length > 0) {
      const receipts = await this.prisma.receivableMovement.findMany({
        where: {
          type: 'RECEIPT',
          receivableId: { in: collectionReceivableIds },
          paidAt: { gte: from, lte: to },
          reversedBy: { none: {} },
        },
        select: { amount: true },
      });
      recoveredViaCollections = receipts.reduce((s, r) => s + dec(r.amount), 0);
    }

    return {
      totalOverdue: round(totalOverdue),
      delinquentCustomers: delinquentCustomerIds.size,
      pendingCollections,
      activePromises,
      recoveredViaCollections: round(recoveredViaCollections),
      period,
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
    };
  }

  async aging() {
    const today = toUtcDateOnly(new Date());
    const rows = await this.prisma.accountReceivable.findMany({
      where: { status: { in: ['OPEN', 'PARTIAL'] } },
    });
    const buckets = {
      d1_7: 0,
      d8_30: 0,
      d31_60: 0,
      d61_90: 0,
      d90_plus: 0,
    };
    for (const row of rows) {
      const money = this.moneyForRow(row);
      const display = resolveDisplayStatus({
        status: row.status,
        dueDate: row.dueDate,
        balance: money.balance,
        today,
      });
      if (display !== 'OVERDUE' || money.balance <= 0.0001) continue;
      const days = daysOverdue(row.dueDate, today);
      if (days <= 7) buckets.d1_7 += money.balance;
      else if (days <= 30) buckets.d8_30 += money.balance;
      else if (days <= 60) buckets.d31_60 += money.balance;
      else if (days <= 90) buckets.d61_90 += money.balance;
      else buckets.d90_plus += money.balance;
    }
    return {
      buckets: [
        { id: '1-7', label: '1–7 dias', amount: round(buckets.d1_7) },
        { id: '8-30', label: '8–30 dias', amount: round(buckets.d8_30) },
        { id: '31-60', label: '31–60 dias', amount: round(buckets.d31_60) },
        { id: '61-90', label: '61–90 dias', amount: round(buckets.d61_90) },
        { id: '90+', label: '90+ dias', amount: round(buckets.d90_plus) },
      ],
    };
  }

  async agenda(period = 'WEEK') {
    const { from, to } = this.resolvePeriodBounds(period);
    const cases = await this.prisma.collectionCase.findMany({
      where: {
        status: { in: OPEN_STATUSES },
        nextActionAt: { gte: from, lte: to },
      },
      include: {
        customer: {
          select: { id: true, code: true, name: true, phone: true },
        },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { nextActionAt: 'asc' },
      take: 100,
    });
    return {
      items: cases.map((c) => ({
        id: c.id,
        sequentialId: c.sequentialId,
        number: `CB-${c.sequentialId}`,
        customer: c.customer,
        status: c.status,
        statusLabel: STATUS_LABELS[c.status],
        nextAction: c.nextAction,
        nextActionLabel: c.nextAction ? NEXT_ACTION_LABELS[c.nextAction] : null,
        nextActionAt: c.nextActionAt?.toISOString() ?? null,
        nextActionNotes: c.nextActionNotes,
        assignee: c.assignee,
        priorityScore: c.priorityScore,
      })),
    };
  }

  async list(filters: ListCollectionFilters) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const where: Prisma.CollectionCaseWhereInput = {};

    if (filters.status && filters.status !== 'ALL') {
      where.status = filters.status as CollectionCaseStatus;
    }
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.search?.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { customer: { name: { contains: q, mode: 'insensitive' } } },
        { customer: { document: { contains: q, mode: 'insensitive' } } },
        { customer: { code: { contains: q, mode: 'insensitive' } } },
        { notes: { contains: q, mode: 'insensitive' } },
      ];
      const seq = Number(q.replace(/\D/g, ''));
      if (Number.isFinite(seq) && seq > 0) {
        where.OR.push({ sequentialId: seq });
      }
    }

    const rows = await this.prisma.collectionCase.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            code: true,
            name: true,
            document: true,
            phone: true,
            email: true,
          },
        },
        assignee: { select: { id: true, name: true } },
        items: {
          where: { removedAt: null },
          include: { receivable: true },
        },
        contacts: {
          orderBy: { contactedAt: 'desc' },
          take: 1,
          select: { contactedAt: true },
        },
        promises: {
          where: { status: 'OVERDUE' },
          select: { id: true },
        },
      },
      orderBy: [{ priorityScore: 'desc' }, { updatedAt: 'desc' }],
    });

    const today = toUtcDateOnly(new Date());
    let items = rows.map((row) => this.toListItem(row, today));

    if (filters.financialStatus && filters.financialStatus !== 'ALL') {
      items = items.filter(
        (i) => i.financialStatus === filters.financialStatus,
      );
    }
    if (filters.daysBucket && filters.daysBucket !== 'ALL') {
      items = items.filter((i) =>
        this.matchesDaysBucket(i.maxDaysOverdue, filters.daysBucket!),
      );
    }
    if (filters.amountMin != null) {
      items = items.filter((i) => i.overdueAmount >= filters.amountMin!);
    }
    if (filters.amountMax != null) {
      items = items.filter((i) => i.overdueAmount <= filters.amountMax!);
    }

    const total = items.length;
    const slice = items.slice((page - 1) * pageSize, page * pageSize);
    return {
      items: slice,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async getById(id: string) {
    const row = await this.prisma.collectionCase.findUnique({
      where: { id },
      include: {
        customer: true,
        assignee: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        items: {
          where: { removedAt: null },
          include: { receivable: { include: { customer: true } } },
        },
        contacts: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { contactedAt: 'desc' },
          take: 50,
        },
        promises: {
          include: { createdBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        auditLogs: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
    if (!row) throw new CollectionNotFoundError();

    const today = toUtcDateOnly(new Date());
    const list = this.toListItem(row, today);
    const receivables = row.items.map((item) => {
      const r = item.receivable;
      const money = this.moneyForRow(r);
      const displayStatus = resolveDisplayStatus({
        status: r.status,
        dueDate: r.dueDate,
        balance: money.balance,
        today,
      });
      return {
        id: r.id,
        sequentialId: r.sequentialId,
        number: `CR-${r.sequentialId}`,
        description: r.description,
        document: r.document,
        dueDate: r.dueDate.toISOString().slice(0, 10),
        status: r.status,
        displayStatus,
        overdueDays:
          displayStatus === 'OVERDUE' ? daysOverdue(r.dueDate, today) : 0,
        originalAmount: money.originalAmount,
        balance: money.balance,
        paidAmount: money.paidAmount,
        updatedAmount: money.updatedAmount,
        contasReceberPath: `/app/financeiro/contas-receber?id=${r.id}`,
      };
    });

    return {
      ...list,
      notes: row.notes,
      openedAt: row.openedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
      nextActionNotes: row.nextActionNotes,
      createdBy: row.createdBy,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        document: row.customer.document,
        documentType: row.customer.documentType,
        phone: row.customer.phone,
        email: row.customer.email,
      },
      receivables,
      contacts: row.contacts.map((c) => ({
        id: c.id,
        channel: c.channel,
        channelLabel: CHANNEL_LABELS[c.channel],
        outcome: c.outcome,
        outcomeLabel: OUTCOME_LABELS[c.outcome],
        contactedAt: c.contactedAt.toISOString(),
        notes: c.notes,
        actor: c.actor,
      })),
      promises: row.promises.map((p) => ({
        id: p.id,
        promisedAmount: dec(p.promisedAmount),
        promisedDate: p.promisedDate.toISOString().slice(0, 10),
        status: p.status,
        notes: p.notes,
        createdBy: p.createdBy,
        createdAt: p.createdAt.toISOString(),
      })),
      history: row.auditLogs.map((a) => ({
        id: a.id,
        action: a.action,
        amount: a.amount != null ? dec(a.amount) : null,
        message: a.message,
        actor: a.actor,
        createdAt: a.createdAt.toISOString(),
      })),
      metrics: {
        overdueAmount: list.overdueAmount,
        overdueAccountsCount: list.overdueAccountsCount,
        maxDaysOverdue: list.maxDaysOverdue,
        priorityScore: list.priorityScore,
        contactsCount: row.contacts.length,
        activePromises: row.promises.filter(
          (p) => p.status === 'PENDING' || p.status === 'OVERDUE',
        ).length,
      },
      renegotiateHint: {
        path: '/app/financeiro/contas-receber',
        message:
          'Renegociação é feita em Contas a Receber (F1). Use o endpoint /acordo com receivableId para delegar.',
      },
    };
  }

  async create(
    actorId: string,
    input: {
      customerId?: string;
      receivableIds?: string[];
      notes?: string | null;
      assigneeId?: string | null;
    },
  ) {
    let customerId = input.customerId?.trim() || '';
    const receivableIds = [
      ...new Set((input.receivableIds ?? []).filter(Boolean)),
    ];

    if (!customerId && receivableIds.length === 0) {
      throw new CollectionValidationError(
        'Informe customerId ou receivableIds.',
        'CUSTOMER_OR_RECEIVABLES_REQUIRED',
      );
    }

    if (receivableIds.length > 0) {
      const receivables = await this.prisma.accountReceivable.findMany({
        where: { id: { in: receivableIds } },
      });
      if (receivables.length !== receivableIds.length) {
        throw new CollectionValidationError(
          'Uma ou mais contas a receber não foram encontradas.',
          'RECEIVABLE_NOT_FOUND',
        );
      }
      const customerIds = new Set(receivables.map((r) => r.customerId));
      if (customerIds.size > 1) {
        throw new CollectionValidationError(
          'Todas as contas devem ser do mesmo cliente.',
          'MULTIPLE_CUSTOMERS',
        );
      }
      customerId = receivables[0].customerId;
      if (input.customerId && input.customerId !== customerId) {
        throw new CollectionValidationError(
          'customerId não corresponde às contas informadas.',
          'CUSTOMER_MISMATCH',
        );
      }
    } else {
      const customer = await this.prisma.customer.findUnique({
        where: { id: customerId },
      });
      if (!customer) {
        throw new CollectionValidationError(
          'Cliente não encontrado.',
          'CUSTOMER_NOT_FOUND',
        );
      }
    }

    const existingOpen = await this.prisma.collectionCase.findFirst({
      where: { customerId, status: { in: OPEN_STATUSES } },
      orderBy: { openedAt: 'desc' },
    });

    let caseId: string;
    if (existingOpen) {
      caseId = existingOpen.id;
      if (input.notes?.trim()) {
        await this.prisma.collectionCase.update({
          where: { id: caseId },
          data: {
            notes: [existingOpen.notes, input.notes.trim()]
              .filter(Boolean)
              .join('\n'),
            assigneeId: input.assigneeId || existingOpen.assigneeId,
          },
        });
      } else if (input.assigneeId) {
        await this.prisma.collectionCase.update({
          where: { id: caseId },
          data: { assigneeId: input.assigneeId },
        });
      }
    } else {
      const created = await this.prisma.collectionCase.create({
        data: {
          customerId,
          status: 'PENDING',
          notes: input.notes?.trim() || null,
          assigneeId: input.assigneeId || null,
          createdById: actorId,
        },
      });
      caseId = created.id;
      await this.audit(caseId, actorId, 'CREATE', 'Caso de cobrança aberto.');
    }

    for (const receivableId of receivableIds) {
      const existingItem = await this.prisma.collectionItem.findUnique({
        where: {
          caseId_receivableId: { caseId, receivableId },
        },
      });
      if (existingItem) {
        if (existingItem.removedAt) {
          await this.prisma.collectionItem.update({
            where: { id: existingItem.id },
            data: { removedAt: null, includedAt: new Date() },
          });
        }
      } else {
        await this.prisma.collectionItem.create({
          data: { caseId, receivableId },
        });
      }
    }

    // Se só customerId, anexar títulos vencidos em aberto
    if (receivableIds.length === 0) {
      const overdue = await this.findOverdueReceivables(customerId);
      for (const receivableId of overdue.map((r) => r.id)) {
        const existingItem = await this.prisma.collectionItem.findUnique({
          where: { caseId_receivableId: { caseId, receivableId } },
        });
        if (!existingItem) {
          await this.prisma.collectionItem.create({
            data: { caseId, receivableId },
          });
        } else if (existingItem.removedAt) {
          await this.prisma.collectionItem.update({
            where: { id: existingItem.id },
            data: { removedAt: null, includedAt: new Date() },
          });
        }
      }
    }

    await this.sync.refreshCase(caseId);
    return this.getById(caseId);
  }

  async registerContact(
    actorId: string,
    caseId: string,
    input: {
      channel: CollectionContactChannel;
      outcome: CollectionContactOutcome;
      contactedAt?: string;
      notes?: string | null;
      nextAction?: CollectionNextAction | null;
      nextActionAt?: string | null;
      nextActionNotes?: string | null;
    },
  ) {
    await this.requireOpenCase(caseId);

    // Canais de mensagem: apenas registra contato; não envia.
    if (
      (input.channel === 'WHATSAPP' ||
        input.channel === 'EMAIL' ||
        input.channel === 'SMS') &&
      input.notes == null
    ) {
      // allow register; FE should show messaging stub separately
    }

    await this.prisma.collectionContact.create({
      data: {
        caseId,
        channel: input.channel,
        outcome: input.outcome,
        contactedAt: input.contactedAt
          ? new Date(input.contactedAt)
          : new Date(),
        notes: input.notes?.trim() || null,
        actorId,
      },
    });

    let status: CollectionCaseStatus = 'CONTACTED';
    if (input.outcome === 'PROMISED_PAYMENT') status = 'PROMISED';
    else if (
      input.outcome === 'NO_ANSWER' ||
      input.outcome === 'INVALID_NUMBER'
    )
      status = 'NO_RESPONSE';
    else if (input.outcome === 'PAID') status = 'IN_PROGRESS';

    const update: Prisma.CollectionCaseUpdateInput = { status };
    if (input.nextAction) {
      update.nextAction = input.nextAction;
      update.nextActionAt = input.nextActionAt
        ? new Date(input.nextActionAt)
        : null;
      update.nextActionNotes = input.nextActionNotes?.trim() || null;
    }

    await this.prisma.collectionCase.update({
      where: { id: caseId },
      data: update,
    });
    await this.audit(
      caseId,
      actorId,
      'CONTACT',
      `${CHANNEL_LABELS[input.channel]} · ${OUTCOME_LABELS[input.outcome]}`,
    );
    await this.sync.refreshCase(caseId);
    return this.getById(caseId);
  }

  async createPromise(
    actorId: string,
    caseId: string,
    input: {
      promisedAmount: number;
      promisedDate: string;
      notes?: string | null;
    },
  ) {
    await this.requireOpenCase(caseId);
    if (!Number.isFinite(input.promisedAmount) || input.promisedAmount <= 0) {
      throw new CollectionValidationError(
        'Valor da promessa inválido.',
        'INVALID_AMOUNT',
      );
    }
    await this.prisma.paymentPromise.create({
      data: {
        caseId,
        promisedAmount: input.promisedAmount,
        promisedDate: toUtcDateOnly(input.promisedDate),
        notes: input.notes?.trim() || null,
        createdById: actorId,
      },
    });
    await this.prisma.collectionCase.update({
      where: { id: caseId },
      data: {
        status: 'PROMISED',
        nextAction: 'CHECK_PROMISE',
        nextActionAt: toUtcDateOnly(input.promisedDate),
      },
    });
    await this.audit(
      caseId,
      actorId,
      'PROMISE',
      `Promessa de R$ ${input.promisedAmount.toFixed(2)}`,
      input.promisedAmount,
    );
    await this.sync.refreshCase(caseId);
    return this.getById(caseId);
  }

  async cancelPromise(actorId: string, caseId: string, promiseId: string) {
    await this.requireOpenCase(caseId);
    const promise = await this.prisma.paymentPromise.findFirst({
      where: { id: promiseId, caseId },
    });
    if (!promise) {
      throw new CollectionNotFoundError('Promessa não encontrada.');
    }
    if (promise.status === 'CANCELLED' || promise.status === 'KEPT') {
      throw new CollectionValidationError(
        'Promessa não pode ser cancelada.',
        'INVALID_PROMISE_STATUS',
      );
    }
    await this.prisma.paymentPromise.update({
      where: { id: promiseId },
      data: { status: 'CANCELLED' },
    });
    await this.audit(caseId, actorId, 'PROMISE_CANCEL', 'Promessa cancelada.');
    await this.sync.refreshCase(caseId);
    return this.getById(caseId);
  }

  async assign(actorId: string, caseId: string, assigneeId: string | null) {
    await this.requireCase(caseId);
    if (assigneeId) {
      const user = await this.prisma.user.findFirst({
        where: { id: assigneeId, status: 'ACTIVE' },
      });
      if (!user) {
        throw new CollectionValidationError(
          'Responsável inválido.',
          'ASSIGNEE_NOT_FOUND',
        );
      }
    }
    await this.prisma.collectionCase.update({
      where: { id: caseId },
      data: { assigneeId },
    });
    await this.audit(
      caseId,
      actorId,
      'ASSIGN',
      assigneeId ? `Responsável definido.` : 'Responsável removido.',
    );
    return this.getById(caseId);
  }

  async setNextAction(
    actorId: string,
    caseId: string,
    input: {
      nextAction: CollectionNextAction;
      nextActionAt?: string | null;
      notes?: string | null;
    },
  ) {
    const row = await this.requireOpenCase(caseId);
    await this.prisma.collectionCase.update({
      where: { id: caseId },
      data: {
        nextAction: input.nextAction,
        nextActionAt: input.nextActionAt ? new Date(input.nextActionAt) : null,
        nextActionNotes: input.notes?.trim() || null,
        ...(row.status === 'PENDING' ? { status: 'IN_PROGRESS' as const } : {}),
      },
    });
    await this.audit(
      caseId,
      actorId,
      'NEXT_ACTION',
      NEXT_ACTION_LABELS[input.nextAction],
    );
    return this.getById(caseId);
  }

  async cancel(actorId: string, caseId: string, reason: string) {
    if (!reason?.trim()) {
      throw new CollectionValidationError(
        'Informe o motivo.',
        'REASON_REQUIRED',
      );
    }
    const row = await this.requireOpenCase(caseId);
    await this.prisma.collectionCase.update({
      where: { id: caseId },
      data: {
        status: 'CANCELLED',
        closedAt: new Date(),
        notes: [row.notes, `Cancelado: ${reason.trim()}`]
          .filter(Boolean)
          .join('\n'),
      },
    });
    await this.audit(caseId, actorId, 'CANCEL', reason.trim());
    return this.getById(caseId);
  }

  async resolve(
    actorId: string,
    caseId: string,
    input: { force?: boolean; reason?: string | null },
  ) {
    const row = await this.requireOpenCase(caseId);
    const items = await this.prisma.collectionItem.findMany({
      where: { caseId, removedAt: null },
      include: { receivable: true },
    });
    const today = toUtcDateOnly(new Date());
    const allClear = items.every((item) => {
      const money = this.moneyForRow(item.receivable);
      return (
        item.receivable.status === 'SETTLED' ||
        item.receivable.status === 'CANCELLED' ||
        item.receivable.status === 'RENEGOTIATED' ||
        money.balance <= 0.0001 ||
        resolveDisplayStatus({
          status: item.receivable.status,
          dueDate: item.receivable.dueDate,
          balance: money.balance,
          today,
        }) !== 'OVERDUE'
      );
    });

    if (!allClear && !input.force) {
      throw new CollectionValidationError(
        'Ainda há saldo em atraso. Use force=true com motivo para resolver manualmente.',
        'BALANCE_REMAINING',
      );
    }
    if (!allClear && input.force && !input.reason?.trim()) {
      throw new CollectionValidationError(
        'Informe o motivo para forçar a resolução.',
        'REASON_REQUIRED',
      );
    }

    await this.prisma.collectionCase.update({
      where: { id: caseId },
      data: {
        status: 'RESOLVED',
        closedAt: new Date(),
        notes: input.force
          ? [row.notes, `Resolvido (forçado): ${input.reason!.trim()}`]
              .filter(Boolean)
              .join('\n')
          : row.notes,
      },
    });
    await this.audit(
      caseId,
      actorId,
      input.force ? 'FORCE_RESOLVE' : 'RESOLVE',
      input.reason?.trim() || 'Caso resolvido.',
    );
    return this.getById(caseId);
  }

  async acordo(
    actorId: string,
    caseId: string,
    input: {
      receivableId: string;
      installmentCount: number;
      firstDueDate: string;
      interestAmount?: number;
      discountAmount?: number;
      notes?: string | null;
    },
  ) {
    await this.requireOpenCase(caseId);
    const item = await this.prisma.collectionItem.findFirst({
      where: {
        caseId,
        receivableId: input.receivableId,
        removedAt: null,
      },
    });
    if (!item) {
      throw new CollectionValidationError(
        'Conta a receber não está vinculada a este caso.',
        'RECEIVABLE_NOT_IN_CASE',
      );
    }

    const renegotiated = await this.contasReceber.renegotiate(
      actorId,
      input.receivableId,
      {
        installmentCount: input.installmentCount,
        firstDueDate: input.firstDueDate,
        interestAmount: input.interestAmount,
        discountAmount: input.discountAmount,
        notes: input.notes,
      },
    );

    // Anexa o novo título renegociado ao caso
    const existing = await this.prisma.collectionItem.findUnique({
      where: {
        caseId_receivableId: { caseId, receivableId: renegotiated.id },
      },
    });
    if (!existing) {
      await this.prisma.collectionItem.create({
        data: { caseId, receivableId: renegotiated.id },
      });
    }

    await this.audit(
      caseId,
      actorId,
      'ACORDO',
      `Renegociação delegada a Contas a Receber → ${renegotiated.number}`,
      renegotiated.balance,
    );
    await this.sync.refreshCase(caseId);
    return {
      case: await this.getById(caseId),
      renegotiated,
      renegotiatePath: `/app/financeiro/contas-receber?id=${renegotiated.id}`,
    };
  }

  async eficiencia(period = 'MONTH') {
    const { from, to } = this.resolvePeriodBounds(period);
    const dashboard = await this.dashboard(period);

    const resolvedCount = await this.prisma.collectionCase.count({
      where: {
        status: 'RESOLVED',
        closedAt: { gte: from, lte: to },
      },
    });

    const promisesInPeriod = await this.prisma.paymentPromise.findMany({
      where: { createdAt: { gte: from, lte: to } },
      select: { status: true },
    });
    const kept = promisesInPeriod.filter((p) => p.status === 'KEPT').length;
    const keptPromisesPct =
      promisesInPeriod.length === 0
        ? 0
        : round((kept / promisesInPeriod.length) * 100);

    const recoveryRate =
      dashboard.totalOverdue + dashboard.recoveredViaCollections <= 0.0001
        ? 0
        : round(
            (dashboard.recoveredViaCollections /
              (dashboard.totalOverdue + dashboard.recoveredViaCollections)) *
              100,
          );

    return {
      recoveredAmount: dashboard.recoveredViaCollections,
      recoveryRate,
      keptPromisesPct,
      resolvedCount,
      period,
    };
  }

  private async findOverdueReceivables(customerId: string) {
    const today = toUtcDateOnly(new Date());
    const rows = await this.prisma.accountReceivable.findMany({
      where: {
        customerId,
        status: { in: ['OPEN', 'PARTIAL'] },
      },
    });
    return rows.filter((row) => {
      const money = this.moneyForRow(row);
      return (
        resolveDisplayStatus({
          status: row.status,
          dueDate: row.dueDate,
          balance: money.balance,
          today,
        }) === 'OVERDUE'
      );
    });
  }

  private toListItem(
    row: {
      id: string;
      sequentialId: number;
      status: CollectionCaseStatus;
      priorityScore: number;
      nextAction: CollectionNextAction | null;
      nextActionAt: Date | null;
      notes: string | null;
      customer: {
        id: string;
        code: string;
        name: string;
        document: string | null;
        phone?: string | null;
        email?: string | null;
      };
      assignee: { id: string; name: string } | null;
      items: Array<{
        receivable: {
          id: string;
          status: 'OPEN' | 'PARTIAL' | 'SETTLED' | 'CANCELLED' | 'RENEGOTIATED';
          dueDate: Date;
          originalAmount: unknown;
          discountAmount: unknown;
          interestAmount: unknown;
          fineAmount: unknown;
          paidAmount: unknown;
        };
      }>;
      contacts?: Array<{ contactedAt: Date }>;
      promises?: Array<{ id: string }>;
    },
    today: Date,
  ) {
    let overdueAmount = 0;
    let maxDaysOverdue = 0;
    let overdueAccountsCount = 0;
    let openBalance = 0;

    for (const item of row.items) {
      const money = this.moneyForRow(item.receivable);
      openBalance += money.balance;
      const display = resolveDisplayStatus({
        status: item.receivable.status,
        dueDate: item.receivable.dueDate,
        balance: money.balance,
        today,
      });
      if (display === 'OVERDUE' && money.balance > 0.0001) {
        overdueAmount += money.balance;
        overdueAccountsCount += 1;
        maxDaysOverdue = Math.max(
          maxDaysOverdue,
          daysOverdue(item.receivable.dueDate, today),
        );
      }
    }

    const hasBrokenPromise = (row.promises?.length ?? 0) > 0;
    const livePriority = computePriorityScore({
      overdueAmount,
      maxDaysOverdue,
      overdueAccounts: overdueAccountsCount,
      hasBrokenPromise,
    });

    let financialStatus: string = 'OPEN';
    if (overdueAccountsCount > 0) financialStatus = 'OVERDUE';
    else if (openBalance <= 0.0001) financialStatus = 'SETTLED';
    else financialStatus = 'OPEN';

    return {
      id: row.id,
      sequentialId: row.sequentialId,
      number: `CB-${row.sequentialId}`,
      customer: {
        id: row.customer.id,
        code: row.customer.code,
        name: row.customer.name,
        document: row.customer.document,
        phone: row.customer.phone ?? null,
        email: row.customer.email ?? null,
      },
      overdueAccountsCount,
      overdueAmount: round(overdueAmount),
      maxDaysOverdue,
      lastContactAt: row.contacts?.[0]?.contactedAt?.toISOString() ?? null,
      nextAction: row.nextAction,
      nextActionLabel: row.nextAction
        ? NEXT_ACTION_LABELS[row.nextAction]
        : null,
      nextActionAt: row.nextActionAt?.toISOString() ?? null,
      status: row.status,
      statusLabel: STATUS_LABELS[row.status],
      financialStatus,
      assignee: row.assignee,
      priorityScore: Math.max(row.priorityScore, livePriority),
      notes: row.notes,
    };
  }

  private moneyForRow(row: {
    originalAmount: unknown;
    discountAmount: unknown;
    interestAmount: unknown;
    fineAmount: unknown;
    paidAmount: unknown;
  }) {
    return calculateReceivableMoney({
      originalAmount: dec(row.originalAmount),
      discountAmount: dec(row.discountAmount),
      interestAmount: dec(row.interestAmount),
      fineAmount: dec(row.fineAmount),
      paidAmount: dec(row.paidAmount),
    });
  }

  private matchesDaysBucket(days: number, bucket: string) {
    switch (bucket) {
      case '1-7':
        return days >= 1 && days <= 7;
      case '8-30':
        return days >= 8 && days <= 30;
      case '31-60':
        return days >= 31 && days <= 60;
      case '61-90':
        return days >= 61 && days <= 90;
      case '90+':
        return days > 90;
      default:
        return true;
    }
  }

  private resolvePeriodBounds(period?: string): { from: Date; to: Date } {
    const today = toUtcDateOnly(new Date());
    switch (period) {
      case 'TODAY':
        return { from: today, to: today };
      case 'LAST_7':
      case 'WEEK': {
        const from = new Date(today);
        from.setUTCDate(from.getUTCDate() - 7);
        return { from, to: today };
      }
      case 'PREV_MONTH': {
        const from = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1),
        );
        const to = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0),
        );
        return { from, to };
      }
      case 'YEAR': {
        const from = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
        return { from, to: today };
      }
      case 'MONTH':
      default: {
        const from = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1),
        );
        const to = new Date(
          Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0),
        );
        return { from, to };
      }
    }
  }

  private async requireCase(id: string) {
    const row = await this.prisma.collectionCase.findUnique({ where: { id } });
    if (!row) throw new CollectionNotFoundError();
    return row;
  }

  private async requireOpenCase(id: string) {
    const row = await this.requireCase(id);
    if (row.status === 'CANCELLED' || row.status === 'RESOLVED') {
      throw new CollectionValidationError(
        'Caso encerrado não permite esta operação.',
        'CASE_CLOSED',
      );
    }
    return row;
  }

  private async audit(
    caseId: string,
    actorId: string,
    action: string,
    message?: string,
    amount?: number,
  ) {
    await this.prisma.collectionAuditLog.create({
      data: {
        caseId,
        actorId,
        action,
        message: message ?? null,
        amount: amount ?? null,
      },
    });
  }
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
