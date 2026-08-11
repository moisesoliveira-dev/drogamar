import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ValidadeFilters = {
  alertWindowDays: number
  status: string
  search: string
  categoryId: string
  brandId: string
  lotNumber: string
  locationId: string
  expiryFrom: string
  expiryTo: string
  onlyWithQuantity: boolean
  page: number
  pageSize: number
  sortBy: string
  sortDir: 'asc' | 'desc'
}

const initial: ValidadeFilters = {
  alertWindowDays: 30,
  status: 'ATTENTION',
  search: '',
  categoryId: '',
  brandId: '',
  lotNumber: '',
  locationId: '',
  expiryFrom: '',
  expiryTo: '',
  onlyWithQuantity: false,
  page: 1,
  pageSize: 20,
  sortBy: 'expiryDate',
  sortDir: 'asc',
}

type State = ValidadeFilters & {
  draft: ValidadeFilters
  setDraft: <K extends keyof ValidadeFilters>(
    key: K,
    value: ValidadeFilters[K],
  ) => void
  applyDraft: () => void
  clearFilters: () => void
  setPage: (page: number) => void
  toggleSort: (sortBy: string) => void
  setAlertWindowDays: (days: number) => void
}

export const useValidadeStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,
      draft: { ...initial },
      setDraft: (key, value) =>
        set((state) => ({
          draft: { ...state.draft, [key]: value },
        })),
      applyDraft: () => {
        const { draft } = get()
        set({
          ...draft,
          page: 1,
          draft: { ...draft, page: 1 },
        })
      },
      clearFilters: () => {
        const next = {
          ...initial,
          alertWindowDays: get().alertWindowDays,
        }
        set({ ...next, draft: { ...next } })
      },
      setPage: (page) => set({ page, draft: { ...get().draft, page } }),
      toggleSort: (sortBy) => {
        const current = get()
        if (current.sortBy === sortBy) {
          const sortDir = current.sortDir === 'asc' ? 'desc' : 'asc'
          set({
            sortDir,
            page: 1,
            draft: { ...current.draft, sortBy, sortDir, page: 1 },
          })
          return
        }
        set({
          sortBy,
          sortDir: 'asc',
          page: 1,
          draft: { ...current.draft, sortBy, sortDir: 'asc', page: 1 },
        })
      },
      setAlertWindowDays: (days) =>
        set((state) => ({
          alertWindowDays: days,
          page: 1,
          draft: { ...state.draft, alertWindowDays: days, page: 1 },
        })),
    }),
    {
      name: 'drogamar.validade',
      partialize: (state) => ({
        alertWindowDays: state.alertWindowDays,
      }),
    },
  ),
)
