import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  searchSystemAction,
  selectCustomerForSaleAction,
} from '../application/global-search.actions'
import type { GlobalSearchHit } from '../domain/global-search.schema'
import { GlobalSearch } from '../components/GlobalSearch'

export function GlobalSearchContainer() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [selecting, setSelecting] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(query.trim()), 250)
    return () => window.clearTimeout(handle)
  }, [query])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const input = document.getElementById(
          'global-search',
        ) as HTMLInputElement | null
        input?.focus()
        input?.select()
        setOpen(true)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const searchQuery = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => searchSystemAction(debounced),
    enabled: open && debounced.length > 0,
    placeholderData: (prev) => prev,
  })

  const pages = searchQuery.data?.pages ?? []
  const products = searchQuery.data?.products ?? []
  const customers = searchQuery.data?.customers ?? []
  const hitsLength = pages.length + products.length + customers.length
  const safeActiveIndex =
    hitsLength === 0 ? 0 : Math.min(activeIndex, hitsLength - 1)

  async function handleSelect(hit: GlobalSearchHit) {
    setSelecting(true)
    try {
      if (hit.kind === 'customer') {
        try {
          await selectCustomerForSaleAction(hit.customerId)
        } catch {
          // ainda navega para o carrinho mesmo se a associação falhar
        }
        navigate(hit.path)
      } else {
        navigate(hit.path)
      }
      setQuery('')
      setDebounced('')
      setOpen(false)
      setActiveIndex(0)
    } finally {
      setSelecting(false)
    }
  }

  return (
    <GlobalSearch
      query={query}
      open={open}
      loading={searchQuery.isFetching || selecting}
      pages={pages}
      products={products}
      customers={customers}
      activeIndex={safeActiveIndex}
      onQueryChange={(value) => {
        setQuery(value)
        setOpen(true)
        setActiveIndex(0)
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => {
        window.setTimeout(() => setOpen(false), 120)
      }}
      onClose={() => {
        setOpen(false)
        setQuery('')
        setActiveIndex(0)
      }}
      onActiveIndexChange={setActiveIndex}
      onSelect={(hit) => void handleSelect(hit)}
    />
  )
}
