/**
 * Preparado para RBAC futuro.
 */
export function useExportPermissions() {
  return {
    canView: true,
    canCreate: true,
    canDownload: true,
    canCancel: true,
    canExportItems: true,
    canExportLots: true,
    canExportCurrentStock: true,
    canExportCategories: true,
    canExportSensitive: true,
  }
}
