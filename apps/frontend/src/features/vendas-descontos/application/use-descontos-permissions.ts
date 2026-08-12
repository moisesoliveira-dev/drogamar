import type { PromotionPermissions } from '../domain/promocao.schema'

const open: PromotionPermissions = {
  canView: true,
  canCreate: true,
  canEdit: true,
  canActivate: true,
  canPause: true,
  canCancel: true,
  canDelete: true,
  canApplyManualDiscount: true,
  canApproveDiscount: true,
}

/** Preparado para RBAC — o backend é a autoridade; a UI só esconde ações. */
export function useDescontosPermissions(
  fromApi?: PromotionPermissions | null,
): PromotionPermissions {
  return fromApi ?? open
}
