import type { ReactNode } from 'react'
import styles from './Alert.module.css'

export type AlertProps = {
  variant?: 'danger' | 'warn' | 'success'
  children: ReactNode
  role?: 'alert' | 'status'
}

export function Alert({
  variant = 'danger',
  children,
  role = 'alert',
}: AlertProps) {
  return (
    <div className={[styles.alert, styles[variant]].join(' ')} role={role}>
      {children}
    </div>
  )
}
