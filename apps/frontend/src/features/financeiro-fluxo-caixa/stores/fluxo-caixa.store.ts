import { create } from 'zustand'

type FluxoCaixaFilters = {
  search: string
  period: string
  from: string
  to: string
  direction: string
  status: string
  bankAccountId: string
  categoryId: string
  costCenterId: string
  origin: string
  page: number
  pageSize: number
  selectedId: string | null
  setFilter: (key: string, value: string | number) => void
  setSearch: (value: string) => void
  setSelectedId: (id: string | null) => void
  clearFilters: () => void
}

const defaults = {
  search: '',
  period: 'MONTH',
  from: '',
  to: '',
  direction: 'ALL',
  status: 'ALL',
  bankAccountId: '',
  categoryId: '',
  costCenterId: '',
  origin: 'ALL',
  page: 1,
  pageSize: 20,
  selectedId: null as string | null,
}

export const useFluxoCaixaStore = create<FluxoCaixaFilters>((set) => ({
  ...defaults,
  setFilter: (key, value) =>
    set((state) => ({
      ...state,
      [key]: value,
      page: key === 'page' ? Number(value) : 1,
    })),
  setSearch: (value) => set({ search: value, page: 1 }),
  setSelectedId: (id) => set({ selectedId: id }),
  clearFilters: () => set({ ...defaults }),
}))
