/**
 * Preparado para RBAC futuro.
 * Hoje: usuário autenticado tem todas as ações de F1.
 */
export function useItemPermissions() {
  return {
    canView: true,
    canCreate: true,
    canEdit: true,
    canDeactivate: true,
    canDelete: true,
    canExport: false,
  }
}
