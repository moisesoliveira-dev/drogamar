import { create } from 'zustand'
import type {
  ExportDraftFilters,
  ExportFormat,
  ExportType,
} from '../domain/export.schema'

export type ExportDraft = {
  type: ExportType
  format: ExportFormat
  filters: ExportDraftFilters
  columns: string[]
  sortBy: string
  sortDir: 'asc' | 'desc'
  fileName: string
}

type State = {
  draft: ExportDraft
  historyPage: number
  activeJobId: string | null
  setType: (type: ExportType, defaults?: Partial<ExportDraft>) => void
  setFormat: (format: ExportFormat) => void
  setFilter: (key: string, value: string | boolean | number | '') => void
  setColumns: (columns: string[]) => void
  toggleColumn: (id: string) => void
  selectAllColumns: (ids: string[]) => void
  clearColumns: () => void
  setSortBy: (sortBy: string) => void
  setSortDir: (sortDir: 'asc' | 'desc') => void
  setFileName: (fileName: string) => void
  applyPreset: (draft: Partial<ExportDraft> & { type: ExportType }) => void
  setHistoryPage: (page: number) => void
  setActiveJobId: (id: string | null) => void
}

const initialDraft: ExportDraft = {
  type: 'ITEMS',
  format: 'XLSX',
  filters: {},
  columns: [],
  sortBy: 'description',
  sortDir: 'asc',
  fileName: '',
}

export const useExportacaoStore = create<State>((set, get) => ({
  draft: initialDraft,
  historyPage: 1,
  activeJobId: null,
  setType: (type, defaults) =>
    set({
      draft: {
        ...initialDraft,
        type,
        format: defaults?.format ?? 'XLSX',
        filters: defaults?.filters ?? {},
        columns: defaults?.columns ?? [],
        sortBy: defaults?.sortBy ?? 'description',
        sortDir: defaults?.sortDir ?? 'asc',
        fileName: defaults?.fileName ?? '',
      },
    }),
  setFormat: (format) =>
    set((state) => ({ draft: { ...state.draft, format } })),
  setFilter: (key, value) =>
    set((state) => ({
      draft: {
        ...state.draft,
        filters: { ...state.draft.filters, [key]: value },
      },
    })),
  setColumns: (columns) =>
    set((state) => ({ draft: { ...state.draft, columns } })),
  toggleColumn: (id) => {
    const { draft } = get()
    const exists = draft.columns.includes(id)
    set({
      draft: {
        ...draft,
        columns: exists
          ? draft.columns.filter((col) => col !== id)
          : [...draft.columns, id],
      },
    })
  },
  selectAllColumns: (ids) =>
    set((state) => ({ draft: { ...state.draft, columns: [...ids] } })),
  clearColumns: () =>
    set((state) => ({ draft: { ...state.draft, columns: [] } })),
  setSortBy: (sortBy) =>
    set((state) => ({ draft: { ...state.draft, sortBy } })),
  setSortDir: (sortDir) =>
    set((state) => ({ draft: { ...state.draft, sortDir } })),
  setFileName: (fileName) =>
    set((state) => ({ draft: { ...state.draft, fileName } })),
  applyPreset: (preset) =>
    set((state) => ({
      draft: {
        ...state.draft,
        ...preset,
        filters: preset.filters ?? {},
        columns: preset.columns ?? state.draft.columns,
      },
    })),
  setHistoryPage: (page) => set({ historyPage: page }),
  setActiveJobId: (id) => set({ activeJobId: id }),
}))
