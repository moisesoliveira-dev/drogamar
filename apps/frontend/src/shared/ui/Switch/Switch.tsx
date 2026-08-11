import type { InputHTMLAttributes } from 'react'
import { useId } from 'react'
import styles from './Switch.module.css'

export type SwitchProps = {
  label: string
  description?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange'>

export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  id,
  disabled,
  className,
  ...rest
}: SwitchProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label
      className={[styles.wrap, disabled ? styles.disabled : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        className={styles.input}
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        {...rest}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={styles.copy}>
        <span className={styles.label}>{label}</span>
        {description ? (
          <span className={styles.description}>{description}</span>
        ) : null}
      </span>
    </label>
  )
}
