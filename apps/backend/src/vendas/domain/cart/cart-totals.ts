export type CartLineInput = {
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
};

export type CartTotalsInput = {
  lines: CartLineInput[];
  cartDiscount: number;
  cartSurcharge: number;
};

export type CartTotals = {
  itemsGross: number;
  lineDiscounts: number;
  cartDiscount: number;
  discounts: number;
  surcharges: number;
  subtotal: number;
  total: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function lineGross(quantity: number, unitPrice: number): number {
  return roundMoney(quantity * unitPrice);
}

export function lineSubtotal(
  quantity: number,
  unitPrice: number,
  lineDiscount: number,
): number {
  return roundMoney(lineGross(quantity, unitPrice) - lineDiscount);
}

/** Totais financeiros — fonte de verdade no backend. */
export function calculateCartTotals(input: CartTotalsInput): CartTotals {
  const itemsGross = roundMoney(
    input.lines.reduce(
      (sum, line) => sum + lineGross(line.quantity, line.unitPrice),
      0,
    ),
  );
  const lineDiscounts = roundMoney(
    input.lines.reduce((sum, line) => sum + line.lineDiscount, 0),
  );
  const cartDiscount = roundMoney(Math.max(0, input.cartDiscount));
  const surcharges = roundMoney(Math.max(0, input.cartSurcharge));
  const discounts = roundMoney(lineDiscounts + cartDiscount);
  const subtotal = itemsGross;
  const total = roundMoney(subtotal - discounts + surcharges);

  return {
    itemsGross,
    lineDiscounts,
    cartDiscount,
    discounts,
    surcharges,
    subtotal,
    total: Math.max(0, total),
  };
}
