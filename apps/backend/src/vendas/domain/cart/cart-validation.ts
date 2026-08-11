import { calculateCartTotals, lineGross } from './cart-totals';

export type CartIssueCode =
  | 'INACTIVE_ITEM'
  | 'INVALID_PRICE'
  | 'INSUFFICIENT_STOCK'
  | 'INVALID_QUANTITY'
  | 'INVALID_LINE_DISCOUNT'
  | 'INVALID_CART_DISCOUNT'
  | 'EMPTY_CART'
  | 'CUSTOMER_REQUIRED'
  | 'PRICE_CHANGED'
  | 'STOCK_CHANGED';

export type CartIssue = {
  code: CartIssueCode;
  message: string;
  itemId?: string;
  lineId?: string;
};

export type CartLineValidationInput = {
  lineId: string;
  stockItemId: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
  itemStatus: 'ACTIVE' | 'INACTIVE';
  currentSalePrice: number | null;
  trackStock: boolean;
  availableStock: number;
  productDescription: string;
};

export type CartValidationInput = {
  lines: CartLineValidationInput[];
  cartDiscount: number;
  cartSurcharge: number;
  requireCustomer: boolean;
  hasCustomer: boolean;
  /** Quando true, divergência de preço/estoque vira aviso (itemsUpdated), não bloqueio. */
  softConcurrency?: boolean;
};

export type CartValidationResult = {
  canCheckout: boolean;
  issues: CartIssue[];
  warnings: CartIssue[];
  itemsUpdated: boolean;
};

export function validateCartLineQuantity(quantity: number): CartIssue | null {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return {
      code: 'INVALID_QUANTITY',
      message: 'Quantidade inválida.',
    };
  }
  return null;
}

export function validateLineDiscount(
  quantity: number,
  unitPrice: number,
  lineDiscount: number,
): CartIssue | null {
  if (!Number.isFinite(lineDiscount) || lineDiscount < 0) {
    return {
      code: 'INVALID_LINE_DISCOUNT',
      message: 'Desconto da linha inválido.',
    };
  }
  const gross = lineGross(quantity, unitPrice);
  if (lineDiscount > gross + 0.0001) {
    return {
      code: 'INVALID_LINE_DISCOUNT',
      message: 'Desconto da linha não pode exceder o subtotal.',
    };
  }
  return null;
}

export function validateCart(input: CartValidationInput): CartValidationResult {
  const issues: CartIssue[] = [];
  const warnings: CartIssue[] = [];
  let itemsUpdated = false;

  if (input.lines.length === 0) {
    issues.push({
      code: 'EMPTY_CART',
      message: 'Adicione produtos para começar uma venda.',
    });
  }

  if (input.requireCustomer && !input.hasCustomer) {
    issues.push({
      code: 'CUSTOMER_REQUIRED',
      message: 'Selecione um cliente para continuar.',
    });
  }

  for (const line of input.lines) {
    const qtyIssue = validateCartLineQuantity(line.quantity);
    if (qtyIssue) {
      issues.push({
        ...qtyIssue,
        itemId: line.stockItemId,
        lineId: line.lineId,
      });
    }

    if (line.itemStatus !== 'ACTIVE') {
      issues.push({
        code: 'INACTIVE_ITEM',
        message: `${line.productDescription} está inativo.`,
        itemId: line.stockItemId,
        lineId: line.lineId,
      });
    }

    if (
      line.currentSalePrice == null ||
      !Number.isFinite(line.currentSalePrice) ||
      line.currentSalePrice <= 0
    ) {
      issues.push({
        code: 'INVALID_PRICE',
        message: `${line.productDescription} está sem preço válido.`,
        itemId: line.stockItemId,
        lineId: line.lineId,
      });
    } else if (Math.abs(line.currentSalePrice - line.unitPrice) > 0.0001) {
      itemsUpdated = true;
      const issue: CartIssue = {
        code: 'PRICE_CHANGED',
        message: `Preço de ${line.productDescription} foi atualizado.`,
        itemId: line.stockItemId,
        lineId: line.lineId,
      };
      if (input.softConcurrency) warnings.push(issue);
      else issues.push(issue);
    }

    if (line.trackStock) {
      if (line.availableStock < line.quantity) {
        issues.push({
          code: 'INSUFFICIENT_STOCK',
          message: `${line.productDescription} sem estoque suficiente.`,
          itemId: line.stockItemId,
          lineId: line.lineId,
        });
      }
    }

    const discountIssue = validateLineDiscount(
      line.quantity,
      line.unitPrice,
      line.lineDiscount,
    );
    if (discountIssue) {
      issues.push({
        ...discountIssue,
        itemId: line.stockItemId,
        lineId: line.lineId,
      });
    }
  }

  const totals = calculateCartTotals({
    lines: input.lines.map((l) => ({
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineDiscount: l.lineDiscount,
    })),
    cartDiscount: input.cartDiscount,
    cartSurcharge: input.cartSurcharge,
  });

  if (
    !Number.isFinite(input.cartDiscount) ||
    input.cartDiscount < 0 ||
    input.cartDiscount > totals.itemsGross - totals.lineDiscounts + 0.0001
  ) {
    issues.push({
      code: 'INVALID_CART_DISCOUNT',
      message: 'Desconto do carrinho inválido.',
    });
  }

  return {
    canCheckout: issues.length === 0 && input.lines.length > 0,
    issues,
    warnings,
    itemsUpdated,
  };
}
