import { create } from 'zustand'

type DescontosUiState = {
  search: string
  status: string
  formOpen: boolean
  simulateOpen: boolean
  filtersOpen: boolean
  editingId: string | null
  setSearch: (value: string) => void
  setStatus: (value: string) => void
  openCreate: () => void
  openEdit: (id: string) => void
  closeForm: () => void
  setSimulateOpen: (open: boolean) => void
  setFiltersOpen: (open: boolean) => void
}

export const useDescontosUiStore = create<DescontosUiState>((set) => ({
  search: '',
  status: '',
  formOpen: false,
  simulateOpen: false,
  filtersOpen: false,
  editingId: null,
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  openCreate: () => set({ formOpen: true, editingId: null }),
  openEdit: (id) => set({ formOpen: true, editingId: id }),
  closeForm: () => set({ formOpen: false, editingId: null }),
  setSimulateOpen: (simulateOpen) => set({ simulateOpen }),
  setFiltersOpen: (filtersOpen) => set({ filtersOpen }),
}))
