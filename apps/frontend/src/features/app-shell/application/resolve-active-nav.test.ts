import { describe, expect, it } from 'vitest'
import { resolveActiveNav } from './resolve-active-nav'

describe('resolveActiveNav', () => {
  it('seleciona vendas/carrinho (F1) a partir da rota', () => {
    const active = resolveActiveNav('/app/vendas/carrinho')
    expect(active.module?.id).toBe('vendas')
    expect(active.item?.id).toBe('carrinho-cliente')
    expect(active.item?.code).toBe('F1')
  })

  it('usa dashboard do módulo em rota base', () => {
    const active = resolveActiveNav('/app/financeiro')
    expect(active.module?.id).toBe('financeiro')
    expect(active.item?.id).toBe('contas-receber')
    expect(active.item?.code).toBe('F1')
  })

  it('resolve início em /app', () => {
    const active = resolveActiveNav('/app')
    expect(active.module?.id).toBe('inicio')
    expect(active.item?.path).toBe('/app')
  })

  it('seleciona estoque/validade (F2) a partir da rota', () => {
    const active = resolveActiveNav('/app/estoque/validade')
    expect(active.module?.id).toBe('estoque')
    expect(active.item?.id).toBe('alerta-validade')
    expect(active.item?.code).toBe('F2')
  })

  it('usa F1 como fallback do estoque na rota base', () => {
    const active = resolveActiveNav('/app/estoque')
    expect(active.module?.id).toBe('estoque')
    expect(active.item?.id).toBe('cadastro-itens')
    expect(active.item?.code).toBe('F1')
  })
})
