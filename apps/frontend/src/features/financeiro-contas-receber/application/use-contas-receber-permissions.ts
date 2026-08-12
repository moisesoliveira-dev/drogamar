/** Preparado para RBAC futuro. */
export function useContasReceberPermissions() {
  return {
    canView: true,
    canCreate: true,
    canReceive: true,
    canReverse: true,
    canDiscount: true,
    canRenegotiate: true,
    canCancel: true,
    canExport: true,
    canSendCollection: true,
  }
}
