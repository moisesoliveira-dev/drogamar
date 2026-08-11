import type { ReactNode } from 'react'
import styles from './MetricCard.module.css'

export type MetricCardProps = {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'neutral' | 'danger' | 'warn' | 'success' | 'info'
  loading?: boolean
}

export function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
  loading,
}: MetricCardProps) {
  if (loading) {
    return <div className={styles.skeleton} aria-hidden="true" />
  }

  return (
    <article className={[styles.card, styles[tone]].join(' ')}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
    </article>
  )
}
