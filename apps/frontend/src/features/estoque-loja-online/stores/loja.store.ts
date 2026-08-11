import { create } from 'zustand'

export type LojaFilters = {
  search: string
  status: string
  categoryId: string
  brandId: string
  stock: string
  sync: string
  publish: string
  page: number
  pageSize: number
}

const initial: LojaFilters = {
  search: '',
  status: 'ALL',
  categoryId: '',
  brandId: '',
  stock: 'ALL',
  sync: 'ALL',
  publish: 'ALL',
  page: 1,
  pageSize: 20,
}

type State = LojaFilters & {
  selectedItemId: string | null
  setSearch: (search: string) => void
  setFilter: <K extends keyof LojaFilters>(key: K, value: LojaFilters[K]) => void
  clearFilters: () => void
  setSelectedItemId: (id: string | null) => void
}

export const useLojaStore = create<State>((set) => ({
  ...initial,
  selectedItemId: null,
  setSearch: (search) => set({ search, page: 1 }),
  setFilter: (key, value) =>
    set({
      [key]: value,
      ...(key === 'page' || key === 'pageSize' ? {} : { page: 1 }),
    } as Partial<LojaFilters>),
  clearFilters: () => set({ ...initial }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
}))
