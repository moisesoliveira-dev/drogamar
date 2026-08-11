/**
 * Preparado para RBAC futuro.
 */
export function useValidadePermissions() {
  return {
    canView: true,
    canViewDetails: true,
    canExport: false,
    canAdjustStock: false,
    canMarkTreated: false,
    canConfigureWindow: true,
  }
}
