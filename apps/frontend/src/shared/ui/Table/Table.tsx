import type { ReactNode } from 'react'
import styles from './Table.module.css'

export type TableColumn<T> = {
  id: string
  header: string
  sortable?: boolean
  width?: string
  align?: 'left' | 'right' | 'center'
  cell: (row: T) => ReactNode
}

export type TableProps<T> = {
  columns: TableColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  onSortChange?: (sortBy: string) => void
  loading?: boolean
  error?: string | null
  emptyTitle?: string
  emptyDescription?: string
  selectedKey?: string | null
  onRowClick?: (row: T) => void
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  sortBy,
  sortDir = 'asc',
  onSortChange,
  loading,
  error,
  emptyTitle = 'Nenhum registro encontrado',
  emptyDescription,
  selectedKey,
  onRowClick,
}: TableProps<T>) {
  if (error) {
    return (
      <div className={styles.state} role="alert">
        <p className={styles.stateTitle}>Não foi possível carregar</p>
        <p className={styles.stateBody}>{error}</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.wrap} aria-busy="true" aria-label="Carregando">
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
        <div className={styles.skeleton} />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className={styles.state}>
        <p className={styles.stateTitle}>{emptyTitle}</p>
        {emptyDescription ? (
          <p className={styles.stateBody}>{emptyDescription}</p>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sortBy === col.id
              return (
                <th
                  key={col.id}
                  style={col.width ? { width: col.width } : undefined}
                  className={col.align === 'right' ? styles.right : undefined}
                >
                  {col.sortable && onSortChange ? (
                    <button
                      type="button"
                      className={styles.sortBtn}
                      onClick={() => onSortChange(col.id)}
                      aria-sort={
                        active
                          ? sortDir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      {col.header}
                      {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row)
            return (
              <tr
                key={key}
                className={selectedKey === key ? styles.selected : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                data-clickable={onRowClick ? 'true' : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={col.align === 'right' ? styles.right : undefined}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
