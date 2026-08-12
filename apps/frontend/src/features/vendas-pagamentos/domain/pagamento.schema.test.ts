import { describe, expect, it } from 'vitest'
import {
  computeDraftSummary,
  mapPaymentErrorMessage,
} from './pagamento.schema'

describe('computeDraftSummary', () => {
  it('calcula restante e troco', () => {
    const summary = computeDraftSummary(85, [
      {
        id: '1',
        method: 'CASH',
        methodLabel: 'Dinheiro',
        amount: 85,
        tenderedAmount: 100,
        changeAmount: 15,
      },
    ])
    expect(summary.amountPaid).toBe(85)
    expect(summary.remaining).toBe(0)
    expect(summary.changeAmount).toBe(15)
    expect(summary.canComplete).toBe(true)
  })

  it('marca incompleto quando falta valor', () => {
    const summary = computeDraftSummary(200, [
      {
        id: '1',
        method: 'CASH',
        methodLabel: 'Dinheiro',
        amount: 80,
        tenderedAmount: 80,
        changeAmount: 0,
      },
    ])
    expect(summary.remaining).toBe(120)
    expect(summary.canComplete).toBe(false)
  })
})

describe('mapPaymentErrorMessage', () => {
  it('mapeia códigos amigáveis', () => {
    expect(mapPaymentErrorMessage('INCOMPLETE_PAYMENT')).toContain('incompleto')
    expect(mapPaymentErrorMessage('UNSUPPORTED_METHOD')).toContain('não disponível')
  })
})
