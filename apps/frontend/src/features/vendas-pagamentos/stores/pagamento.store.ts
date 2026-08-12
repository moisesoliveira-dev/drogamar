import { create } from 'zustand'
import type {
  DraftPaymentLine,
  PaymentMethod,
  PaymentReceipt,
} from '../domain/pagamento.schema'

type PagamentoUiState = {
  selectedMethod: string | null
  amountDraft: string
  tenderedDraft: string
  lines: DraftPaymentLine[]
  receipt: PaymentReceipt | null
  cancelDialogOpen: boolean
  idempotencyKey: string | null
  setSelectedMethod: (code: string | null) => void
  setAmountDraft: (value: string) => void
  setTenderedDraft: (value: string) => void
  setLines: (lines: DraftPaymentLine[]) => void
  addLine: (line: DraftPaymentLine) => void
  removeLine: (id: string) => void
  setReceipt: (receipt: PaymentReceipt | null) => void
  setCancelDialogOpen: (open: boolean) => void
  ensureIdempotencyKey: () => string
  resetForNewSale: () => void
  hydrateMethod: (methods: PaymentMethod[], remaining: number) => void
}

function newKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const usePagamentoUiStore = create<PagamentoUiState>((set, get) => ({
  selectedMethod: null,
  amountDraft: '',
  tenderedDraft: '',
  lines: [],
  receipt: null,
  cancelDialogOpen: false,
  idempotencyKey: null,
  setSelectedMethod: (selectedMethod) => set({ selectedMethod }),
  setAmountDraft: (amountDraft) => set({ amountDraft }),
  setTenderedDraft: (tenderedDraft) => set({ tenderedDraft }),
  setLines: (lines) => set({ lines }),
  addLine: (line) => set({ lines: [...get().lines, line] }),
  removeLine: (id) =>
    set({ lines: get().lines.filter((line) => line.id !== id) }),
  setReceipt: (receipt) => set({ receipt }),
  setCancelDialogOpen: (cancelDialogOpen) => set({ cancelDialogOpen }),
  ensureIdempotencyKey: () => {
    const current = get().idempotencyKey
    if (current) return current
    const key = newKey()
    set({ idempotencyKey: key })
    return key
  },
  resetForNewSale: () =>
    set({
      selectedMethod: null,
      amountDraft: '',
      tenderedDraft: '',
      lines: [],
      receipt: null,
      cancelDialogOpen: false,
      idempotencyKey: null,
    }),
  hydrateMethod: (methods, remaining) => {
    const first = methods[0]
    set({
      selectedMethod: first?.code ?? null,
      amountDraft: remaining > 0 ? String(remaining) : '',
      tenderedDraft: remaining > 0 ? String(remaining) : '',
    })
  },
}))
