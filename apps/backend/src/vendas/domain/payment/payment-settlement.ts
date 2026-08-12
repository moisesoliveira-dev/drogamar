import {
  isPaymentMethodEnabled,
  type SupportedPaymentMethod,
} from './payment-methods';

const MONEY_EPS = 0.0001;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export type PaymentLineInput = {
  method: string;
  /** Valor aplicado à venda. */
  amount: number;
  /** Valor recebido (obrigatório para CASH). */
  tenderedAmount?: number | null;
};

export type NormalizedPaymentLine = {
  method: SupportedPaymentMethod;
  amount: number;
  tenderedAmount: number | null;
  changeAmount: number;
};

export type PaymentSettlement = {
  lines: NormalizedPaymentLine[];
  amountPaid: number;
  remaining: number;
  changeAmount: number;
  canComplete: boolean;
};

export type PaymentValidationIssue = {
  code:
    | 'UNSUPPORTED_METHOD'
    | 'INVALID_AMOUNT'
    | 'INVALID_TENDERED'
    | 'NEGATIVE_CHANGE'
    | 'INCOMPLETE_PAYMENT'
    | 'OVERPAYMENT'
    | 'EMPTY_PAYMENTS';
  message: string;
};

function almostEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= MONEY_EPS;
}

export function normalizePaymentLine(
  line: PaymentLineInput,
):
  | { ok: true; value: NormalizedPaymentLine }
  | { ok: false; issue: PaymentValidationIssue } {
  if (!isPaymentMethodEnabled(line.method)) {
    return {
      ok: false,
      issue: {
        code: 'UNSUPPORTED_METHOD',
        message: 'Forma de pagamento não disponível.',
      },
    };
  }

  const amount = roundMoney(line.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      ok: false,
      issue: {
        code: 'INVALID_AMOUNT',
        message: 'Informe um valor de pagamento válido.',
      },
    };
  }

  if (line.method === 'CASH') {
    const tendered =
      line.tenderedAmount == null ? amount : roundMoney(line.tenderedAmount);
    if (!Number.isFinite(tendered) || tendered <= 0) {
      return {
        ok: false,
        issue: {
          code: 'INVALID_TENDERED',
          message: 'Informe o valor recebido em dinheiro.',
        },
      };
    }
    if (tendered + MONEY_EPS < amount) {
      return {
        ok: false,
        issue: {
          code: 'NEGATIVE_CHANGE',
          message: 'Valor recebido insuficiente para o valor pago em dinheiro.',
        },
      };
    }
    const changeAmount = roundMoney(Math.max(0, tendered - amount));
    return {
      ok: true,
      value: {
        method: 'CASH',
        amount,
        tenderedAmount: tendered,
        changeAmount,
      },
    };
  }

  return {
    ok: false,
    issue: {
      code: 'UNSUPPORTED_METHOD',
      message: 'Forma de pagamento não disponível.',
    },
  };
}

/**
 * Fecha a conta: soma dos amounts deve cobrir exatamente o total.
 * Troco = soma dos changeAmount das linhas (ex.: dinheiro).
 * Pagamento parcial não é permitido.
 */
export function settlePayments(
  totalDue: number,
  lines: PaymentLineInput[],
  opts?: { allowPartial?: boolean },
):
  | { ok: true; settlement: PaymentSettlement }
  | { ok: false; issue: PaymentValidationIssue } {
  const allowPartial = opts?.allowPartial ?? false;
  const due = roundMoney(Math.max(0, totalDue));

  if (!lines.length) {
    return {
      ok: false,
      issue: {
        code: 'EMPTY_PAYMENTS',
        message: 'Informe ao menos uma forma de pagamento.',
      },
    };
  }

  const normalized: NormalizedPaymentLine[] = [];
  for (const line of lines) {
    const result = normalizePaymentLine(line);
    if (!result.ok) return result;
    normalized.push(result.value);
  }

  const amountPaid = roundMoney(
    normalized.reduce((sum, line) => sum + line.amount, 0),
  );
  const changeAmount = roundMoney(
    normalized.reduce((sum, line) => sum + line.changeAmount, 0),
  );
  const remaining = roundMoney(Math.max(0, due - amountPaid));

  if (amountPaid > due + MONEY_EPS) {
    return {
      ok: false,
      issue: {
        code: 'OVERPAYMENT',
        message: 'A soma dos pagamentos excede o total da venda.',
      },
    };
  }

  if (!allowPartial && !almostEqual(amountPaid, due)) {
    return {
      ok: false,
      issue: {
        code: 'INCOMPLETE_PAYMENT',
        message: `Pagamento incompleto. Restante: R$ ${remaining.toFixed(2)}.`,
      },
    };
  }

  return {
    ok: true,
    settlement: {
      lines: normalized,
      amountPaid,
      remaining: almostEqual(amountPaid, due) ? 0 : remaining,
      changeAmount,
      canComplete: almostEqual(amountPaid, due),
    },
  };
}
