import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import styles from './Checkbox.module.css'

export type CheckboxProps = {
  label: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>

export function Checkbox({ label, id, className, ...rest }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <label
      className={[styles.root, className ?? ''].filter(Boolean).join(' ')}
      htmlFor={inputId}
    >
      <input
        id={inputId}
        type="checkbox"
        className={styles.input}
        {...rest}
      />
      <span className={styles.box} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </label>
  )
}
