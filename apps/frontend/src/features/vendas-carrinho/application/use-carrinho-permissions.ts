/** Preparado para RBAC futuro — hoje libera operação de venda. */
export function useCarrinhoPermissions() {
  return {
    canView: true,
    canAddItem: true,
    canEditQuantity: true,
    canRemoveItem: true,
    canApplyDiscount: true,
    canApproveDiscount: true,
    canSelectCustomer: true,
    canCheckout: true,
    canClear: true,
  }
}
