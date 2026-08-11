import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import styles from './TextField.module.css'

export type TextFieldProps = {
  label: string
  error?: string
  hint?: string
  leadingIcon?: ReactNode
  trailingSlot?: ReactNode
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      hint,
      leadingIcon,
      trailingSlot,
      id,
      className,
      disabled,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const errorId = `${inputId}-error`
    const hintId = `${inputId}-hint`
    const describedBy = error ? errorId : hint ? hintId : undefined

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
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
        <div className={styles.control}>
          {leadingIcon ? (
            <span className={styles.leading} aria-hidden="true">
              {leadingIcon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={inputId}
            className={styles.input}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            {...rest}
          />
          {trailingSlot ? (
            <span className={styles.trailing}>{trailingSlot}</span>
          ) : null}
        </div>
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
