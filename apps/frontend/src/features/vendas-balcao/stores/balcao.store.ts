import { create } from 'zustand'

type BalcaoUiState = {
  searchDraft: string
  productDialogOpen: boolean
  customerDialogOpen: boolean
  heldDialogOpen: boolean
  closeDialogOpen: boolean
  cancelSaleDialogOpen: boolean
  openingAmount: string
  openingNotes: string
  selectedRegisterId: string | null
  closingAmount: string
  closingNotes: string
  productSearch: string
  customerSearch: string
  setSearchDraft: (value: string) => void
  setProductDialogOpen: (open: boolean) => void
  setCustomerDialogOpen: (open: boolean) => void
  setHeldDialogOpen: (open: boolean) => void
  setCloseDialogOpen: (open: boolean) => void
  setCancelSaleDialogOpen: (open: boolean) => void
  setOpeningAmount: (value: string) => void
  setOpeningNotes: (value: string) => void
  setSelectedRegisterId: (id: string | null) => void
  setClosingAmount: (value: string) => void
  setClosingNotes: (value: string) => void
  setProductSearch: (value: string) => void
  setCustomerSearch: (value: string) => void
}

export const useBalcaoUiStore = create<BalcaoUiState>((set) => ({
  searchDraft: '',
  productDialogOpen: false,
  customerDialogOpen: false,
  heldDialogOpen: false,
  closeDialogOpen: false,
  cancelSaleDialogOpen: false,
  openingAmount: '0',
  openingNotes: '',
  selectedRegisterId: null,
  closingAmount: '',
  closingNotes: '',
  productSearch: '',
  customerSearch: '',
  setSearchDraft: (searchDraft) => set({ searchDraft }),
  setProductDialogOpen: (productDialogOpen) => set({ productDialogOpen }),
  setCustomerDialogOpen: (customerDialogOpen) => set({ customerDialogOpen }),
  setHeldDialogOpen: (heldDialogOpen) => set({ heldDialogOpen }),
  setCloseDialogOpen: (closeDialogOpen) => set({ closeDialogOpen }),
  setCancelSaleDialogOpen: (cancelSaleDialogOpen) =>
    set({ cancelSaleDialogOpen }),
  setOpeningAmount: (openingAmount) => set({ openingAmount }),
  setOpeningNotes: (openingNotes) => set({ openingNotes }),
  setSelectedRegisterId: (selectedRegisterId) => set({ selectedRegisterId }),
  setClosingAmount: (closingAmount) => set({ closingAmount }),
  setClosingNotes: (closingNotes) => set({ closingNotes }),
  setProductSearch: (productSearch) => set({ productSearch }),
  setCustomerSearch: (customerSearch) => set({ customerSearch }),
}))
