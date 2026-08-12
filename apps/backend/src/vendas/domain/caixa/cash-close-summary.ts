export type CashCloseTotalsInput = {
  openingAmount: number;
  cashSales: number;
  pixSales: number;
  cardSales: number;
  otherSales: number;
  sangrias: number;
  suprimentos: number;
  declaredAmount: number | null;
};

export type CashCloseSummary = {
  openingAmount: number;
  totalSold: number;
  cash: number;
  pix: number;
  card: number;
  other: number;
  sangrias: number;
  suprimentos: number;
  expectedAmount: number;
  declaredAmount: number | null;
  difference: number | null;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/** Resumo de fechamento — esperado = fundo + dinheiro vendido − sangrias + suprimentos. */
export function calculateCashCloseSummary(
  input: CashCloseTotalsInput,
): CashCloseSummary {
  const openingAmount = roundMoney(Math.max(0, input.openingAmount));
  const cash = roundMoney(Math.max(0, input.cashSales));
  const pix = roundMoney(Math.max(0, input.pixSales));
  const card = roundMoney(Math.max(0, input.cardSales));
  const other = roundMoney(Math.max(0, input.otherSales));
  const sangrias = roundMoney(Math.max(0, input.sangrias));
  const suprimentos = roundMoney(Math.max(0, input.suprimentos));
  const totalSold = roundMoney(cash + pix + card + other);
  const expectedAmount = roundMoney(
    openingAmount + cash - sangrias + suprimentos,
  );
  const declaredAmount =
    input.declaredAmount == null
      ? null
      : roundMoney(Math.max(0, input.declaredAmount));
  const difference =
    declaredAmount == null ? null : roundMoney(declaredAmount - expectedAmount);

  return {
    openingAmount,
    totalSold,
    cash,
    pix,
    card,
    other,
    sangrias,
    suprimentos,
    expectedAmount,
    declaredAmount,
    difference,
  };
}
