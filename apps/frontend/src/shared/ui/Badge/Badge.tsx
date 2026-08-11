import type { ReactNode } from 'react'
import styles from './Badge.module.css'

export type BadgeProps = {
  variant?: 'neutral' | 'success' | 'warn' | 'danger' | 'info'
  children: ReactNode
}

export function Badge({ variant = 'neutral', children }: BadgeProps) {
  return (
    <span className={[styles.badge, styles[variant]].join(' ')}>{children}</span>
  )
}
