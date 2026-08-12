import { create } from 'zustand'

type ContasPagarFilters = {
  search: string
  status: string
  period: string
  supplierId: string
  categoryId: string
  paymentMethodId: string
  bankAccountId: string
  costCenterId: string
  origin: string
  page: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
  selectedId: string | null
  setFilter: (key: string, value: string | number) => void
  setSearch: (value: string) => void
  setSelectedId: (id: string | null) => void
  clearFilters: () => void
}

const defaults = {
  search: '',
  status: 'ALL',
  period: 'ALL',
  supplierId: '',
  categoryId: '',
  paymentMethodId: '',
  bankAccountId: '',
  costCenterId: '',
  origin: 'ALL',
  page: 1,
  pageSize: 20,
  sortBy: 'dueDate',
  sortDir: 'asc' as const,
  selectedId: null as string | null,
}

export const useContasPagarStore = create<ContasPagarFilters>((set) => ({
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
