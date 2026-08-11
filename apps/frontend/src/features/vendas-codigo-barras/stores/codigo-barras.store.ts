import { create } from 'zustand'
import type { BarcodeLookupResult } from '../domain/codigo-barras.schema'

type CodigoBarrasUiState = {
  codeDraft: string
  quantityDraft: string
  lastResult: BarcodeLookupResult | null
  feedback: string | null
  setCodeDraft: (value: string) => void
  setQuantityDraft: (value: string) => void
  setLastResult: (value: BarcodeLookupResult | null) => void
  setFeedback: (value: string | null) => void
  resetAfterAdd: () => void
}

export const useCodigoBarrasUiStore = create<CodigoBarrasUiState>((set) => ({
  codeDraft: '',
  quantityDraft: '1',
  lastResult: null,
  feedback: null,
  setCodeDraft: (codeDraft) => set({ codeDraft }),
  setQuantityDraft: (quantityDraft) => set({ quantityDraft }),
  setLastResult: (lastResult) => set({ lastResult }),
  setFeedback: (feedback) => set({ feedback }),
  resetAfterAdd: () =>
    set({
      codeDraft: '',
      quantityDraft: '1',
      feedback: null,
    }),
}))
