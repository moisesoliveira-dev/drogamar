import { create } from 'zustand'

export type ItemListFilters = {
  search: string
  status: string
  categoryId: string
  brandId: string
  locationId: string
  measureUnitId: string
  itemType: string
  page: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
}

const initial: ItemListFilters = {
  search: '',
  status: '',
  categoryId: '',
  brandId: '',
  locationId: '',
  measureUnitId: '',
  itemType: '',
  page: 1,
  pageSize: 20,
  sortBy: 'description',
  sortDir: 'asc',
}

type State = ItemListFilters & {
  setFilter: <K extends keyof ItemListFilters>(
    key: K,
    value: ItemListFilters[K],
  ) => void
  setSearch: (search: string) => void
  clearFilters: () => void
  toggleSort: (sortBy: string) => void
}

export const useItemListStore = create<State>((set, get) => ({
  ...initial,
  setFilter: (key, value) =>
    set({
      [key]: value,
      ...(key === 'page' || key === 'pageSize' || key === 'sortBy' || key === 'sortDir'
        ? {}
        : { page: 1 }),
    } as Partial<ItemListFilters>),
  setSearch: (search) => set({ search, page: 1 }),
  clearFilters: () => set({ ...initial }),
  toggleSort: (sortBy) => {
    const current = get()
    if (current.sortBy === sortBy) {
      set({
        sortDir: current.sortDir === 'asc' ? 'desc' : 'asc',
        page: 1,
      })
      return
    }
    set({ sortBy, sortDir: 'asc', page: 1 })
  },
}))
