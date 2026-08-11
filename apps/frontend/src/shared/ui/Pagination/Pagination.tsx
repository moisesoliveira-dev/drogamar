import styles from './Pagination.module.css'

export type PaginationProps = {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className={styles.bar}>
      <p className={styles.meta}>
        {total === 0
          ? '0 itens'
          : `${from}–${to} de ${total}`}
      </p>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.btn}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </button>
        <span className={styles.page}>
          Página {page} / {totalPages}
        </span>
        <button
          type="button"
          className={styles.btn}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  )
}
