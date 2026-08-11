import type { OnlineStorePending } from './online-store.types';

export function evaluatePublishReadiness(input: {
  itemStatus: 'ACTIVE' | 'INACTIVE';
  code: string;
  sku: string | null;
  erpSalePrice: number | null;
  useErpPrice: boolean;
  priceOverride: number | null;
  promoPrice: number | null;
  promoStartsAt: Date | null;
  promoEndsAt: Date | null;
  availableQty: number;
  trackExpiry: boolean;
  physicalQty: number;
  itemId: string;
}): OnlineStorePending[] {
  const pendings: OnlineStorePending[] = [];

  if (input.itemStatus !== 'ACTIVE') {
    pendings.push({
      code: 'INACTIVE_ITEM',
      message: 'O item está inativo no cadastro do ERP.',
      fixPath: `/app/estoque/itens/${input.itemId}/editar`,
    });
  }

  if (!input.code.trim() && !input.sku?.trim()) {
    pendings.push({
      code: 'NO_IDENTITY',
      message: 'Informe código ou SKU no cadastro do item.',
      fixPath: `/app/estoque/itens/${input.itemId}/editar`,
    });
  }

  const effectivePrice = input.useErpPrice
    ? input.erpSalePrice
    : input.priceOverride;
  if (effectivePrice == null || effectivePrice < 0) {
    pendings.push({
      code: 'NO_PRICE',
      message: 'Preço de venda não informado.',
      fixPath: `/app/estoque/itens/${input.itemId}/editar`,
    });
  }

  if (
    input.promoPrice != null &&
    effectivePrice != null &&
    input.promoPrice > effectivePrice
  ) {
    pendings.push({
      code: 'PROMO_INVALID',
      message: 'O preço promocional não pode ser maior que o preço de venda.',
    });
  }

  if (
    input.promoStartsAt &&
    input.promoEndsAt &&
    input.promoStartsAt.getTime() > input.promoEndsAt.getTime()
  ) {
    pendings.push({
      code: 'PROMO_INVALID',
      message: 'A data inicial da promoção não pode ser posterior à final.',
    });
  }

  if (input.trackExpiry && input.physicalQty > 0 && input.availableQty <= 0) {
    pendings.push({
      code: 'EXPIRED_STOCK_ONLY',
      message: 'O estoque físico possui apenas lotes vencidos.',
      fixPath: '/app/estoque/validade',
    });
  }

  return pendings;
}
