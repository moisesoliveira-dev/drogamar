/** Preparado para RBAC futuro. */
export function useCaixaBancosPermissions() {
  return {
    canView: true,
    canCreate: true,
    canUpdate: true,
    canActivate: true,
    canTransfer: true,
    canEntrada: true,
    canSaida: true,
    canAdjust: true,
    canReverse: true,
    canRevealSensitive: true,
    canExport: true,
  };
}
