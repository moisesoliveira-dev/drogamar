import { describe, expect, it } from 'vitest'
import { emptyStockItemForm, stockItemFormSchema } from './item.schema'

describe('stockItemFormSchema', () => {
  it('exige descrição', () => {
    const parsed = stockItemFormSchema.safeParse({
      ...emptyStockItemForm(),
      description: '',
    })
    expect(parsed.success).toBe(false)
  })

  it('aceita item mínimo válido', () => {
    const parsed = stockItemFormSchema.safeParse({
      ...emptyStockItemForm(),
      description: 'Ácido cítrico',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.status).toBe('ACTIVE')
      expect(parsed.data.trackStock).toBe(true)
    }
  })

  it('rejeita mínimo maior que máximo', () => {
    const parsed = stockItemFormSchema.safeParse({
      ...emptyStockItemForm(),
      description: 'Item',
      minStock: 10,
      maxStock: 5,
    })
    expect(parsed.success).toBe(false)
  })
})
