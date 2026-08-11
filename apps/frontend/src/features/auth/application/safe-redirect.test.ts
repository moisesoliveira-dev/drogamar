import { describe, expect, it } from 'vitest'
import {
  buildLoginPath,
  getSafeRedirect,
  resolveSafeRedirect,
} from './safe-redirect'

describe('safe-redirect', () => {
  it('aceita path relativo interno', () => {
    expect(getSafeRedirect('/app/pedidos', '/app')).toBe('/app/pedidos')
    expect(resolveSafeRedirect('/app/pedidos')).toBe('/app/pedidos')
  })

  it('bloqueia open redirects', () => {
    expect(resolveSafeRedirect('https://evil.com')).toBe('/app')
    expect(resolveSafeRedirect('//evil.com')).toBe('/app')
    expect(resolveSafeRedirect('/login')).toBe('/app')
    expect(resolveSafeRedirect(null)).toBe('/app')
  })

  it('monta login com redirect seguro', () => {
    expect(buildLoginPath('/app')).toBe('/login?redirect=%2Fapp')
    expect(buildLoginPath('https://evil.com')).toBe('/login')
  })
})
