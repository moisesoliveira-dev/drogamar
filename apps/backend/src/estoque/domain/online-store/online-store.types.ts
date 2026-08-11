export type SalesChannelConnectionStatus =
  | 'DISCONNECTED'
  | 'CONNECTED'
  | 'ERROR';

export type OnlineListingPublishStatus =
  | 'NOT_PUBLISHED'
  | 'PUBLISHED'
  | 'UNAVAILABLE';

export type OnlineListingSyncStatus = 'SYNCED' | 'PENDING' | 'ERROR';

export type OnlineIntegrationStatus =
  | 'PUBLISHED'
  | 'NOT_PUBLISHED'
  | 'PENDING'
  | 'ERROR'
  | 'UNAVAILABLE';

export type OnlineStorePendingCode =
  | 'NO_PRICE'
  | 'INACTIVE_ITEM'
  | 'NO_IDENTITY'
  | 'PROMO_INVALID'
  | 'EXPIRED_STOCK_ONLY';

export type OnlineStorePending = {
  code: OnlineStorePendingCode;
  message: string;
  fixPath?: string;
};

export function resolveIntegrationStatus(input: {
  itemStatus: 'ACTIVE' | 'INACTIVE';
  publishStatus: OnlineListingPublishStatus | null;
  syncStatus: OnlineListingSyncStatus | null;
}): OnlineIntegrationStatus {
  if (input.itemStatus === 'INACTIVE') return 'UNAVAILABLE';
  if (!input.publishStatus || input.publishStatus === 'NOT_PUBLISHED') {
    return 'NOT_PUBLISHED';
  }
  if (input.publishStatus === 'UNAVAILABLE') return 'UNAVAILABLE';
  if (input.syncStatus === 'ERROR') return 'ERROR';
  if (input.syncStatus === 'PENDING') return 'PENDING';
  return 'PUBLISHED';
}

export function friendlySyncError(code: string | null | undefined): string {
  switch (code) {
    case 'NO_PRICE':
      return 'Preço não informado.';
    case 'INACTIVE_ITEM':
      return 'Item inativo no ERP.';
    case 'NO_IDENTITY':
      return 'Código ou SKU não informado.';
    case 'PROMO_INVALID':
      return 'Promoção inconsistente com o preço principal.';
    case 'EXPIRED_STOCK_ONLY':
      return 'Somente lotes vencidos disponíveis.';
    case 'PUBLISH_BLOCKED':
      return 'Não é possível publicar este produto.';
    default:
      return 'Não foi possível sincronizar este produto.';
  }
}
