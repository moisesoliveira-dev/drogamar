import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { SpinnerIcon } from '../icons'
import styles from './Button.module.css'

export type ButtonProps = {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
  children: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  disabled,
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <SpinnerIcon className={styles.spinner} size={16} />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  )
}
