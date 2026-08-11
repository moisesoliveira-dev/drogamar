import { describe, expect, it } from 'vitest'
import { loginSchema } from './login.schema'

describe('loginSchema', () => {
  it('aceita e-mail e senha válidos', () => {
    const result = loginSchema.safeParse({
      email: '  user@drogamar.local ',
      password: 'SegredoForte!123',
      rememberMe: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe('user@drogamar.local')
      expect(result.data.password).toBe('SegredoForte!123')
    }
  })

  it('rejeita e-mail vazio', () => {
    const result = loginSchema.safeParse({
      email: '   ',
      password: 'x',
      rememberMe: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita e-mail inválido', () => {
    const result = loginSchema.safeParse({
      email: 'nao-e-email',
      password: 'x',
      rememberMe: false,
    })
    expect(result.success).toBe(false)
  })

  it('rejeita senha vazia e não faz trim na senha', () => {
    const empty = loginSchema.safeParse({
      email: 'a@b.com',
      password: '',
      rememberMe: false,
    })
    expect(empty.success).toBe(false)

    const spaced = loginSchema.safeParse({
      email: 'a@b.com',
      password: '  senha  ',
      rememberMe: false,
    })
    expect(spaced.success).toBe(true)
    if (spaced.success) {
      expect(spaced.data.password).toBe('  senha  ')
    }
  })
})
