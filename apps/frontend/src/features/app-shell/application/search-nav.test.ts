import { describe, expect, it } from 'vitest'
import { appModules } from '../domain/nav.config'
import { searchNavPages } from '../domain/search-nav'

describe('searchNavPages', () => {
  it('encontra página por label', () => {
    const hits = searchNavPages(appModules, 'carrinho')
    expect(hits.some((h) => h.path === '/app/vendas/carrinho')).toBe(true)
  })

  it('encontra página por código F', () => {
    const hits = searchNavPages(appModules, 'F2')
    expect(hits.some((h) => h.path === '/app/estoque/validade')).toBe(true)
  })

  it('ignora query vazia', () => {
    expect(searchNavPages(appModules, '   ')).toEqual([])
  })

  it('encontra setor financeiro', () => {
    const hits = searchNavPages(appModules, 'financeiro')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits.every((h) => h.moduleLabel === 'Financeiro')).toBe(true)
  })
})
