import { create } from 'zustand'

type CarrinhoUiState = {
  productDialogOpen: boolean
  customerDialogOpen: boolean
  productSearch: string
  customerSearch: string
  setProductDialogOpen: (open: boolean) => void
  setCustomerDialogOpen: (open: boolean) => void
  setProductSearch: (value: string) => void
  setCustomerSearch: (value: string) => void
}

export const useCarrinhoUiStore = create<CarrinhoUiState>((set) => ({
  productDialogOpen: false,
  customerDialogOpen: false,
  productSearch: '',
  customerSearch: '',
  setProductDialogOpen: (open) => set({ productDialogOpen: open }),
  setCustomerDialogOpen: (open) => set({ customerDialogOpen: open }),
  setProductSearch: (value) => set({ productSearch: value }),
  setCustomerSearch: (value) => set({ customerSearch: value }),
}))
