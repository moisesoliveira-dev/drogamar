/** Preparado para RBAC futuro. */
export function useContasPagarPermissions() {
  return {
    canView: true,
    canCreate: true,
    canPay: true,
    canReverse: true,
    canDiscount: true,
    canRenegotiate: true,
    canCancel: true,
    canExport: true,
    canApprove: true,
    canSchedule: true,
  }
}
