import { create } from 'zustand'

type CobrancasFilters = {
  search: string
  status: string
  financialStatus: string
  daysBucket: string
  assigneeId: string
  period: string
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
  status: 'ALL',
  financialStatus: 'ALL',
  daysBucket: 'ALL',
  assigneeId: 'ALL',
  period: 'MONTH',
  page: 1,
  pageSize: 20,
  selectedId: null as string | null,
}

export const useCobrancasStore = create<CobrancasFilters>((set) => ({
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
