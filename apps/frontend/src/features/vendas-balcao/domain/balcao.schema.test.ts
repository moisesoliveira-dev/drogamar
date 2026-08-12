import { describe, expect, it } from 'vitest'
import { caixaStateSchema } from './balcao.schema'

describe('caixaStateSchema', () => {
  it('aceita caixa fechado', () => {
    const parsed = caixaStateSchema.parse({
      open: false,
      session: null,
      registers: [{ id: '1', code: 'CX-01', name: 'Caixa 01' }],
    })
    expect(parsed.open).toBe(false)
    expect(parsed.registers[0]?.code).toBe('CX-01')
  })
})
