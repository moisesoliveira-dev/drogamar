import { create } from 'zustand'

type BuscaIaUiStore = {
  draft: string
  setDraft: (value: string) => void
}

export const useBuscaIaUiStore = create<BuscaIaUiStore>((set) => ({
  draft: '',
  setDraft: (draft) => set({ draft }),
}))
