export function useLojaPermissions() {
  return {
    canView: true,
    canConfigureProduct: true,
    canPublish: true,
    canUnpublish: true,
    canChangePrice: true,
    canSync: true,
    canConfigureChannel: true,
    canViewHistory: true,
    canExport: true,
  }
}
