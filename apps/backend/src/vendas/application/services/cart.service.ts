import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { mapBarcodeProduct } from '../../domain/cart/barcode-product';
import {
  calculateCartTotals,
  lineSubtotal,
} from '../../domain/cart/cart-totals';
import {
  validateCart,
  validateCartLineQuantity,
  validateLineDiscount,
  type CartIssue,
} from '../../domain/cart/cart-validation';
import {
  CartItemNotFoundError,
  CartNotFoundError,
  CartValidationError,
  CustomerNotFoundError,
  ProductNotFoundError,
} from '../../domain/cart/errors';
import { CaixaService } from './caixa.service';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function decOrNull(value: unknown): number | null {
  if (value == null) return null;
  return dec(value);
}

const cartInclude = {
  customer: true,
  operator: { select: { id: true, name: true, email: true } },
  items: {
    include: {
      stockItem: {
        include: {
          saleUnit: true,
          measureUnit: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.SaleCartInclude;

type CartEntity = Prisma.SaleCartGetPayload<{ include: typeof cartInclude }>;

@Injectable()
export class CartService {
  /** Cliente obrigatório — preparado para política futura / F4 balcão. */
  private readonly requireCustomer = false;

  /**
   * Leitura duplicada do mesmo item incrementa a linha existente
   * em vez de criar outra (comportamento padrão PDV / F2).
   */
  private readonly mergeDuplicateLineItems = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly caixa: CaixaService,
  ) {}

  async getOrCreateOpenCart(operatorId: string) {
    let cart = await this.prisma.saleCart.findFirst({
      where: {
        operatorId,
        status: { in: ['OPEN', 'CHECKOUT_PENDING'] },
      },
      include: cartInclude,
      orderBy: { createdAt: 'desc' },
    });

    if (!cart) {
      cart = await this.prisma.saleCart.create({
        data: { operatorId, status: 'OPEN' },
        include: cartInclude,
      });
    } else if (cart.status === 'CHECKOUT_PENDING') {
      // Edição no F1/F2 reabre o carrinho para nova validação no F3.
      cart = await this.prisma.saleCart.update({
        where: { id: cart.id },
        data: { status: 'OPEN' },
        include: cartInclude,
      });
    }

    return this.refreshAndMap(cart, { softConcurrency: true });
  }

  async addItem(
    operatorId: string,
    input: { stockItemId: string; quantity?: number },
  ) {
    await this.caixa.requireOpen(operatorId);
    const quantity = input.quantity ?? 1;
    const qtyIssue = validateCartLineQuantity(quantity);
    if (qtyIssue) {
      throw new CartValidationError(qtyIssue.message, qtyIssue.code);
    }

    const product = await this.loadSellableProduct(input.stockItemId);
    this.assertCanAdd(product, quantity);
    const unitCode =
      product.saleUnit?.code ?? product.measureUnit?.code ?? null;

    const cart = await this.ensureOpenCart(operatorId);
    const existing = this.mergeDuplicateLineItems
      ? cart.items.find((i) => i.stockItemId === product.id)
      : undefined;
    const nextQty = existing ? dec(existing.quantity) + quantity : quantity;

    if (product.trackStock && dec(product.currentStock) < nextQty) {
      throw new CartValidationError(
        `${product.description} sem estoque suficiente.`,
        'INSUFFICIENT_STOCK',
      );
    }

    const unitPrice = dec(product.salePrice);
    if (existing) {
      await this.prisma.saleCartItem.update({
        where: { id: existing.id },
        data: {
          quantity: nextQty,
          unitPrice,
          unitCode,
          productCode: product.code,
          productDescription: product.description,
          sku: product.sku,
        },
      });
    } else {
      await this.prisma.saleCartItem.create({
        data: {
          cartId: cart.id,
          stockItemId: product.id,
          quantity,
          unitPrice,
          lineDiscount: 0,
          unitCode,
          productCode: product.code,
          productDescription: product.description,
          sku: product.sku,
        },
      });
    }

    return this.getFreshMapped(cart.id);
  }

  async updateItem(
    operatorId: string,
    lineId: string,
    input: { quantity?: number; lineDiscount?: number },
  ) {
    await this.caixa.requireOpen(operatorId);
    const cart = await this.ensureOpenCart(operatorId);
    const line = cart.items.find((i) => i.id === lineId);
    if (!line) throw new CartItemNotFoundError();

    const quantity = input.quantity ?? dec(line.quantity);
    const lineDiscount = input.lineDiscount ?? dec(line.lineDiscount);

    const qtyIssue = validateCartLineQuantity(quantity);
    if (qtyIssue) {
      throw new CartValidationError(qtyIssue.message, qtyIssue.code);
    }

    const product = line.stockItem;
    const unitPrice = decOrNull(product.salePrice) ?? dec(line.unitPrice);

    const discountIssue = validateLineDiscount(
      quantity,
      unitPrice,
      lineDiscount,
    );
    if (discountIssue) {
      throw new CartValidationError(discountIssue.message, discountIssue.code);
    }

    if (product.status !== 'ACTIVE') {
      throw new CartValidationError(
        `${product.description} está inativo.`,
        'INACTIVE_ITEM',
      );
    }

    if (unitPrice <= 0) {
      throw new CartValidationError(
        `${product.description} está sem preço válido.`,
        'INVALID_PRICE',
      );
    }

    if (product.trackStock && dec(product.currentStock) < quantity) {
      throw new CartValidationError(
        `${product.description} sem estoque suficiente.`,
        'INSUFFICIENT_STOCK',
      );
    }

    await this.prisma.saleCartItem.update({
      where: { id: lineId },
      data: {
        quantity,
        lineDiscount,
        unitPrice,
        unitCode:
          product.saleUnit?.code ?? product.measureUnit?.code ?? line.unitCode,
        productCode: product.code,
        productDescription: product.description,
        sku: product.sku,
      },
    });

    return this.getFreshMapped(cart.id);
  }

  async removeItem(operatorId: string, lineId: string) {
    await this.caixa.requireOpen(operatorId);
    const cart = await this.ensureOpenCart(operatorId);
    const line = cart.items.find((i) => i.id === lineId);
    if (!line) throw new CartItemNotFoundError();

    await this.prisma.saleCartItem.delete({ where: { id: lineId } });
    return this.getFreshMapped(cart.id);
  }

  async setCustomer(operatorId: string, customerId: string | null) {
    await this.caixa.requireOpen(operatorId);
    const cart = await this.ensureOpenCart(operatorId);

    if (customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: { id: customerId, active: true },
      });
      if (!customer) throw new CustomerNotFoundError();
    }

    await this.prisma.saleCart.update({
      where: { id: cart.id },
      data: { customerId },
    });

    return this.getFreshMapped(cart.id);
  }

  async setCartDiscount(operatorId: string, cartDiscount: number) {
    await this.caixa.requireOpen(operatorId);
    if (!Number.isFinite(cartDiscount) || cartDiscount < 0) {
      throw new CartValidationError(
        'Desconto do carrinho inválido.',
        'INVALID_CART_DISCOUNT',
      );
    }

    const cart = await this.ensureOpenCart(operatorId);
    const totals = calculateCartTotals({
      lines: cart.items.map((i) => ({
        quantity: dec(i.quantity),
        unitPrice: dec(i.unitPrice),
        lineDiscount: dec(i.lineDiscount),
      })),
      cartDiscount: 0,
      cartSurcharge: dec(cart.cartSurcharge),
    });

    const maxDiscount = totals.itemsGross - totals.lineDiscounts;
    if (cartDiscount > maxDiscount + 0.0001) {
      throw new CartValidationError(
        'Desconto do carrinho não pode exceder o subtotal.',
        'INVALID_CART_DISCOUNT',
      );
    }

    await this.prisma.saleCart.update({
      where: { id: cart.id },
      data: { cartDiscount },
    });

    return this.getFreshMapped(cart.id);
  }

  async clear(operatorId: string) {
    await this.caixa.requireOpen(operatorId);
    const cart = await this.ensureOpenCart(operatorId);
    await this.prisma.saleCartItem.deleteMany({ where: { cartId: cart.id } });
    await this.prisma.saleCart.update({
      where: { id: cart.id },
      data: { cartDiscount: 0, cartSurcharge: 0, customerId: null },
    });
    return this.getFreshMapped(cart.id);
  }

  /**
   * Revalida estoque/preço antes do pagamento (F3).
   * Não altera estoque nem cria pagamento.
   */
  async validateForPayment(operatorId: string) {
    await this.caixa.requireOpen(operatorId);
    const cart = await this.ensureOpenCart(operatorId);
    const refreshed = await this.refreshAndMap(cart, {
      softConcurrency: false,
      persistPriceUpdates: true,
    });

    await this.prisma.saleCart.update({
      where: { id: cart.id },
      data: { lastValidatedAt: new Date() },
    });

    return {
      ...refreshed,
      paymentReady: refreshed.canCheckout,
      nextPath: refreshed.canCheckout ? '/app/vendas/pagamentos' : null,
    };
  }

  async searchCustomers(search?: string, page = 1, pageSize = 20) {
    const q = search?.trim();
    const where: Prisma.CustomerWhereInput = {
      active: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { code: { contains: q, mode: 'insensitive' } },
              { document: { contains: q } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.customer.count({ where }),
      this.prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        documentType: c.documentType,
        document: c.document,
        phone: c.phone,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async searchProducts(search?: string, page = 1, pageSize = 20) {
    const q = search?.trim();
    const where: Prisma.StockItemWhereInput = {
      status: 'ACTIVE',
      itemType: { in: ['PRODUCT', 'OTHER', 'SERVICE'] },
      ...(q
        ? {
            OR: [
              { code: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
              { barcode: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockItem.count({ where }),
      this.prisma.stockItem.findMany({
        where,
        include: { saleUnit: true, measureUnit: true },
        orderBy: { description: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description,
        sku: p.sku,
        barcode: p.barcode,
        salePrice: decOrNull(p.salePrice),
        currentStock: dec(p.currentStock),
        trackStock: p.trackStock,
        unitCode: p.saleUnit?.code ?? p.measureUnit?.code ?? null,
        hasValidPrice:
          decOrNull(p.salePrice) != null && (decOrNull(p.salePrice) ?? 0) > 0,
        outOfStock: p.trackStock && dec(p.currentStock) <= 0,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  async hold(operatorId: string) {
    await this.caixa.requireOpen(operatorId);
    const cart = await this.ensureOpenCart(operatorId);
    if (cart.items.length === 0) {
      throw new CartValidationError(
        'Não há itens para suspender.',
        'EMPTY_CART',
      );
    }
    await this.prisma.saleCart.update({
      where: { id: cart.id },
      data: { status: 'HELD' },
    });
    return this.getOrCreateOpenCart(operatorId);
  }

  async listHeld(operatorId: string) {
    const rows = await this.prisma.saleCart.findMany({
      where: { operatorId, status: 'HELD' },
      include: cartInclude,
      orderBy: { updatedAt: 'desc' },
    });
    const items = await Promise.all(
      rows.map((row) => this.refreshAndMap(row, { softConcurrency: true })),
    );
    return { items };
  }

  async resume(operatorId: string, cartId: string) {
    await this.caixa.requireOpen(operatorId);
    const held = await this.prisma.saleCart.findFirst({
      where: { id: cartId, operatorId, status: 'HELD' },
      include: cartInclude,
    });
    if (!held) throw new CartNotFoundError('Venda suspensa não encontrada.');

    const current = await this.prisma.saleCart.findFirst({
      where: {
        operatorId,
        status: { in: ['OPEN', 'CHECKOUT_PENDING'] },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    if (current && current.items.length > 0) {
      await this.prisma.saleCart.update({
        where: { id: current.id },
        data: { status: 'HELD' },
      });
    } else if (current) {
      await this.prisma.saleCart.update({
        where: { id: current.id },
        data: { status: 'CANCELLED' },
      });
    }

    await this.prisma.saleCart.update({
      where: { id: held.id },
      data: { status: 'OPEN' },
    });
    return this.getOrCreateOpenCart(operatorId);
  }

  /**
   * Busca exata por código de barras (F2). Inclui inativos para feedback de UI.
   * Fallback: código interno ou SKU com match exato (case-insensitive).
   */
  async findProductByBarcode(rawCode: string) {
    const code = rawCode.trim();
    if (!code) {
      return { found: false as const, product: null };
    }

    const product =
      (await this.prisma.stockItem.findFirst({
        where: {
          itemType: { in: ['PRODUCT', 'OTHER', 'SERVICE'] },
          barcode: { equals: code, mode: 'insensitive' },
        },
        include: { saleUnit: true, measureUnit: true },
      })) ??
      (await this.prisma.stockItem.findFirst({
        where: {
          itemType: { in: ['PRODUCT', 'OTHER', 'SERVICE'] },
          OR: [
            { code: { equals: code, mode: 'insensitive' } },
            { sku: { equals: code, mode: 'insensitive' } },
          ],
        },
        include: { saleUnit: true, measureUnit: true },
      }));

    if (!product) {
      return { found: false as const, product: null };
    }

    return {
      found: true as const,
      product: mapBarcodeProduct({
        id: product.id,
        code: product.code,
        description: product.description,
        sku: product.sku,
        barcode: product.barcode,
        status: product.status,
        salePrice: decOrNull(product.salePrice),
        currentStock: dec(product.currentStock),
        trackStock: product.trackStock,
        unitCode: product.saleUnit?.code ?? product.measureUnit?.code ?? null,
        imageUrl: null,
      }),
    };
  }

  private async ensureOpenCart(operatorId: string): Promise<CartEntity> {
    let cart = await this.prisma.saleCart.findFirst({
      where: {
        operatorId,
        status: { in: ['OPEN', 'CHECKOUT_PENDING'] },
      },
      include: cartInclude,
      orderBy: { createdAt: 'desc' },
    });
    if (!cart) {
      cart = await this.prisma.saleCart.create({
        data: { operatorId, status: 'OPEN' },
        include: cartInclude,
      });
    } else if (cart.status === 'CHECKOUT_PENDING') {
      cart = await this.prisma.saleCart.update({
        where: { id: cart.id },
        data: { status: 'OPEN' },
        include: cartInclude,
      });
    }
    return cart;
  }

  private async getFreshMapped(cartId: string) {
    const cart = await this.prisma.saleCart.findUnique({
      where: { id: cartId },
      include: cartInclude,
    });
    if (!cart) throw new CartNotFoundError();
    return this.refreshAndMap(cart, { softConcurrency: true });
  }

  private async loadSellableProduct(stockItemId: string) {
    const product = await this.prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: { saleUnit: true, measureUnit: true },
    });
    if (!product) throw new ProductNotFoundError();
    return product;
  }

  private assertCanAdd(
    product: {
      status: string;
      description: string;
      salePrice: unknown;
      trackStock: boolean;
      currentStock: unknown;
    },
    quantity: number,
  ) {
    if (product.status !== 'ACTIVE') {
      throw new CartValidationError(
        `${product.description} está inativo.`,
        'INACTIVE_ITEM',
      );
    }
    const price = decOrNull(product.salePrice);
    if (price == null || price <= 0) {
      throw new CartValidationError(
        `${product.description} está sem preço válido.`,
        'INVALID_PRICE',
      );
    }
    if (product.trackStock && dec(product.currentStock) < quantity) {
      throw new CartValidationError(
        `${product.description} sem estoque suficiente.`,
        'INSUFFICIENT_STOCK',
      );
    }
  }

  private async refreshAndMap(
    cart: CartEntity,
    opts: { softConcurrency: boolean; persistPriceUpdates?: boolean },
  ) {
    if (opts.persistPriceUpdates) {
      const priceUpdates = cart.items
        .map((item) => {
          const currentSalePrice = decOrNull(item.stockItem.salePrice);
          const unitPrice = dec(item.unitPrice);
          if (
            currentSalePrice != null &&
            currentSalePrice > 0 &&
            Math.abs(currentSalePrice - unitPrice) > 0.0001
          ) {
            return { id: item.id, unitPrice: currentSalePrice };
          }
          return null;
        })
        .filter((u): u is { id: string; unitPrice: number } => u != null);

      if (priceUpdates.length > 0) {
        await this.prisma.$transaction(
          priceUpdates.map((u) =>
            this.prisma.saleCartItem.update({
              where: { id: u.id },
              data: { unitPrice: u.unitPrice },
            }),
          ),
        );
        const reloaded = await this.prisma.saleCart.findUnique({
          where: { id: cart.id },
          include: cartInclude,
        });
        if (reloaded) cart = reloaded;
      }
    }

    const lineInputs = cart.items.map((item) => {
      const currentSalePrice = decOrNull(item.stockItem.salePrice);
      return {
        lineId: item.id,
        stockItemId: item.stockItemId,
        quantity: dec(item.quantity),
        unitPrice: dec(item.unitPrice),
        lineDiscount: dec(item.lineDiscount),
        itemStatus: item.stockItem.status,
        currentSalePrice,
        trackStock: item.stockItem.trackStock,
        availableStock: dec(item.stockItem.currentStock),
        productDescription: item.productDescription,
      };
    });

    const validation = validateCart({
      lines: lineInputs,
      cartDiscount: dec(cart.cartDiscount),
      cartSurcharge: dec(cart.cartSurcharge),
      requireCustomer: this.requireCustomer,
      hasCustomer: Boolean(cart.customerId),
      softConcurrency: opts.softConcurrency,
    });

    const totals = calculateCartTotals({
      lines: cart.items.map((i) => ({
        quantity: dec(i.quantity),
        unitPrice: dec(i.unitPrice),
        lineDiscount: dec(i.lineDiscount),
      })),
      cartDiscount: dec(cart.cartDiscount),
      cartSurcharge: dec(cart.cartSurcharge),
    });

    const issuesByLine = new Map<string, CartIssue[]>();
    for (const issue of [...validation.issues, ...validation.warnings]) {
      if (!issue.lineId) continue;
      const list = issuesByLine.get(issue.lineId) ?? [];
      list.push(issue);
      issuesByLine.set(issue.lineId, list);
    }

    return {
      id: cart.id,
      sequentialId: cart.sequentialId,
      status: cart.status,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
      lastValidatedAt: cart.lastValidatedAt?.toISOString() ?? null,
      operator: {
        id: cart.operator.id,
        name: cart.operator.name,
        email: cart.operator.email,
      },
      customer: cart.customer
        ? {
            id: cart.customer.id,
            code: cart.customer.code,
            name: cart.customer.name,
            documentType: cart.customer.documentType,
            document: cart.customer.document,
            phone: cart.customer.phone,
          }
        : null,
      items: cart.items.map((item) => {
        const quantity = dec(item.quantity);
        const unitPrice = dec(item.unitPrice);
        const lineDiscount = dec(item.lineDiscount);
        const currentSalePrice = decOrNull(item.stockItem.salePrice);
        const availableStock = dec(item.stockItem.currentStock);
        const lineIssues = issuesByLine.get(item.id) ?? [];
        return {
          id: item.id,
          stockItemId: item.stockItemId,
          productCode: item.productCode,
          productDescription: item.productDescription,
          sku: item.sku,
          unitCode: item.unitCode,
          quantity,
          unitPrice,
          lineDiscount,
          lineSubtotal: lineSubtotal(quantity, unitPrice, lineDiscount),
          availableStock,
          trackStock: item.stockItem.trackStock,
          itemStatus: item.stockItem.status,
          currentSalePrice,
          outOfStock: item.stockItem.trackStock && availableStock < quantity,
          invalidPrice: currentSalePrice == null || currentSalePrice <= 0,
          issues: lineIssues,
        };
      }),
      totals: {
        subtotal: totals.subtotal,
        discounts: totals.discounts,
        surcharges: totals.surcharges,
        total: totals.total,
        lineDiscounts: totals.lineDiscounts,
        cartDiscount: totals.cartDiscount,
      },
      canCheckout: validation.canCheckout,
      issues: validation.issues,
      warnings: validation.warnings,
      itemsUpdated: validation.itemsUpdated,
      itemsUpdatedMessage: validation.itemsUpdated
        ? 'Alguns itens do carrinho foram atualizados. Revise a venda antes de continuar.'
        : null,
      requireCustomer: this.requireCustomer,
    };
  }
}
