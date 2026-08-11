import { describe, expect, it } from 'vitest'
import {
  resolveLookupStatus,
  statusMessage,
  type BarcodeLookupResult,
} from './codigo-barras.schema'

const sellable: BarcodeLookupResult = {
  found: true,
  product: {
    id: '1',
    code: 'P1',
    description: 'Item',
    sku: 'S1',
    barcode: '789',
    salePrice: 10,
    currentStock: 5,
    trackStock: true,
    unitCode: 'UN',
    imageUrl: null,
    status: 'ACTIVE',
    hasValidPrice: true,
    outOfStock: false,
    canAdd: true,
    unavailableReason: null,
  },
}

describe('resolveLookupStatus / statusMessage', () => {
  it('idle sem resultado', () => {
    expect(resolveLookupStatus(null)).toBe('idle')
    expect(statusMessage('idle')).toBeNull()
  })

  it('not_found', () => {
    expect(resolveLookupStatus({ found: false, product: null })).toBe(
      'not_found',
    )
    expect(statusMessage('not_found')?.title).toBe('Produto não encontrado')
  })

  it('inactive', () => {
    const result: BarcodeLookupResult = {
      found: true,
      product: {
        ...sellable.product!,
        status: 'INACTIVE',
        canAdd: false,
        unavailableReason: 'INACTIVE',
      },
    }
    expect(resolveLookupStatus(result)).toBe('inactive')
    expect(statusMessage('inactive')?.title).toBe('Produto indisponível')
  })

  it('out_of_stock', () => {
    const result: BarcodeLookupResult = {
      found: true,
      product: {
        ...sellable.product!,
        outOfStock: true,
        canAdd: false,
        unavailableReason: 'OUT_OF_STOCK',
      },
    }
    expect(resolveLookupStatus(result)).toBe('out_of_stock')
    expect(statusMessage('out_of_stock')?.title).toBe('Produto sem estoque')
  })

  it('found', () => {
    expect(resolveLookupStatus(sellable)).toBe('found')
  })
})
