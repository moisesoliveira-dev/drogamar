import { type KeyboardEvent } from 'react'
import { SearchIcon } from '../../../shared/ui/icons'
import type { GlobalSearchHit } from '../domain/global-search.schema'
import styles from './GlobalSearch.module.css'

export type GlobalSearchProps = {
  query: string
  open: boolean
  loading: boolean
  pages: GlobalSearchHit[]
  products: GlobalSearchHit[]
  customers: GlobalSearchHit[]
  activeIndex: number
  onQueryChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onClose: () => void
  onActiveIndexChange: (index: number) => void
  onSelect: (hit: GlobalSearchHit) => void
}

function flattenHits(
  pages: GlobalSearchHit[],
  products: GlobalSearchHit[],
  customers: GlobalSearchHit[],
): GlobalSearchHit[] {
  return [...pages, ...products, ...customers]
}

export function GlobalSearch({
  query,
  open,
  loading,
  pages,
  products,
  customers,
  activeIndex,
  onQueryChange,
  onFocus,
  onBlur,
  onClose,
  onActiveIndexChange,
  onSelect,
}: GlobalSearchProps) {
  const hits = flattenHits(pages, products, customers)
  const showPanel = open && query.trim().length > 0
  const empty = !loading && hits.length === 0

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      event.currentTarget.blur()
      return
    }
    if (!showPanel || hits.length === 0) {
      if (event.key === 'ArrowDown' && hits.length > 0) {
        event.preventDefault()
        onActiveIndexChange(0)
      }
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      onActiveIndexChange((activeIndex + 1) % hits.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      onActiveIndexChange((activeIndex - 1 + hits.length) % hits.length)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const hit = hits[activeIndex] ?? hits[0]
      if (hit) onSelect(hit)
    }
  }

  function renderGroup(title: string, items: GlobalSearchHit[], offset: number) {
    if (items.length === 0) return null
    return (
      <div className={styles.group} role="group" aria-label={title}>
        <p className={styles.groupTitle}>{title}</p>
        <ul className={styles.list} role="presentation">
          {items.map((hit, index) => {
            const flatIndex = offset + index
            const active = flatIndex === activeIndex
            return (
              <li key={hit.id} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={active ? styles.optionActive : styles.option}
                  id={`global-search-option-${flatIndex}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => onActiveIndexChange(flatIndex)}
                  onClick={() => onSelect(hit)}
                >
                  <span className={styles.optionTitle}>{hit.title}</span>
                  <span className={styles.optionSub}>{hit.subtitle}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  return (
    <div className={styles.search}>
      <label className={styles.searchLabel} htmlFor="global-search">
        Busca global
      </label>
      <SearchIcon className={styles.searchIcon} size={16} />
      <input
        id="global-search"
        className={styles.searchInput}
        type="search"
        placeholder="Buscar no sistema..."
        autoComplete="off"
        value={query}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        aria-activedescendant={
          showPanel && hits[activeIndex]
            ? `global-search-option-${activeIndex}`
            : undefined
        }
        onChange={(e) => onQueryChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        onKeyDown={handleKeyDown}
      />
      {showPanel ? (
        <div
          id="global-search-results"
          className={styles.panel}
          role="listbox"
          aria-label="Resultados da busca"
        >
          {loading ? <p className={styles.hint}>Buscando…</p> : null}
          {empty ? (
            <p className={styles.hint}>Nenhum resultado para “{query.trim()}”.</p>
          ) : null}
          {renderGroup('Páginas', pages, 0)}
          {renderGroup('Produtos', products, pages.length)}
          {renderGroup(
            'Clientes',
            customers,
            pages.length + products.length,
          )}
          <p className={styles.footer}>
            Enter para abrir · Esc para fechar · Ctrl+K para focar
          </p>
        </div>
      ) : null}
    </div>
  )
}
