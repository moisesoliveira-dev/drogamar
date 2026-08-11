import { describe, expect, it } from 'vitest'
import { resolveActiveNav } from './resolve-active-nav'

describe('resolveActiveNav', () => {
  it('seleciona comercial/clientes a partir da rota', () => {
    const active = resolveActiveNav('/app/comercial/clientes')
    expect(active.module?.id).toBe('comercial')
    expect(active.item?.id).toBe('clientes')
  })

  it('usa dashboard do módulo em rota base', () => {
    const active = resolveActiveNav('/app/financeiro')
    expect(active.module?.id).toBe('financeiro')
    expect(active.item?.path).toBe('/app/financeiro')
  })

  it('resolve início em /app', () => {
    const active = resolveActiveNav('/app')
    expect(active.module?.id).toBe('inicio')
    expect(active.item?.path).toBe('/app')
  })
})
