import { describe, expect, it } from 'vitest'
import { combineDateTime, promotionFormSchema } from './promocao.schema'

describe('promotionFormSchema', () => {
  it('rejeita período invertido', () => {
    const result = promotionFormSchema.safeParse({
      name: 'Promo',
      type: 'PERCENT',
      scope: 'ALL',
      stacking: 'EXCLUSIVE',
      priority: 1,
      percentOff: '10',
      startDate: '2026-12-01',
      startTime: '10:00',
      endDate: '2026-01-01',
      endTime: '10:00',
      targetIds: [],
    })
    expect(result.success).toBe(false)
  })

  it('combina data e hora', () => {
    const value = combineDateTime('2026-08-11', '09:30')
    expect(value).toBeInstanceOf(Date)
    expect(value?.getHours()).toBe(9)
  })
})
