import { describe, expect, it } from 'vitest'
import { buscaIaResultSchema } from './busca-ia.schema'

describe('buscaIaResultSchema', () => {
  it('rejeita item sem id real', () => {
    expect(() =>
      buscaIaResultSchema.parse({
        query: 'teste',
        source: 'local',
        llmAvailable: false,
        interpreted: {
          raw: 'teste',
          search: 'teste',
          categoryName: null,
          brandName: null,
          priceMin: null,
          priceMax: null,
          inStock: null,
          similarTo: null,
        },
        message: 'ok',
        items: [
          {
            description: 'Inventado',
            salePrice: 10,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
        totalPages: 1,
      }),
    ).toThrow()
  })
})
