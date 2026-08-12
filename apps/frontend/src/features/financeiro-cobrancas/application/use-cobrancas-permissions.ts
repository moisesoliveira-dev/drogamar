/** Preparado para RBAC futuro. */
export function useCobrancasPermissions() {
  return {
    canView: true,
    canCreate: true,
    canContact: true,
    canPromise: true,
    canAssign: true,
    canResolve: true,
    canCancel: true,
    canExport: true,
    canAcordo: true,
  }
}
