import type { SelectHTMLAttributes } from 'react'
import { forwardRef, useId } from 'react'
import styles from './SelectField.module.css'

export type SelectOption = {
  value: string
  label: string
}

export type SelectFieldProps = {
  label: string
  error?: string
  hint?: string
  options: SelectOption[]
  placeholder?: string
  emptyLabel?: string
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField(
    {
      label,
      error,
      hint,
      options,
      placeholder = 'Selecione…',
      emptyLabel,
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId()
    const selectId = id ?? generatedId
    const errorId = `${selectId}-error`
    const hintId = `${selectId}-hint`

    return (
      <div
        className={[
          styles.field,
          error ? styles.hasError : '',
          disabled ? styles.disabled : '',
          className ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <label className={styles.label} htmlFor={selectId}>
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={styles.select}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          {...rest}
        >
          <option value="">{emptyLabel ?? placeholder}</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error ? (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        ) : hint ? (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        ) : null}
      </div>
    )
  },
)
