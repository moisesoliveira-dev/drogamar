/** Preparado para RBAC futuro. */
export function useFluxoCaixaPermissions() {
  return {
    canView: true,
    canCreate: true,
    canTransfer: true,
    canCancel: true,
    canReverse: true,
    canExport: true,
  }
}
