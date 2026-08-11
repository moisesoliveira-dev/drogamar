import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Alert } from '../../../shared/ui/Alert'
import { Button } from '../../../shared/ui/Button'
import { Checkbox } from '../../../shared/ui/Checkbox'
import {
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
} from '../../../shared/ui/icons'
import { TextField } from '../../../shared/ui/TextField'
import type { LoginFieldErrors } from '../domain/login.schema'
import styles from './LoginForm.module.css'

export type LoginFormValues = {
  email: string
  password: string
  rememberMe: boolean
}

export type LoginFormProps = {
  initialEmail?: string
  loading?: boolean
  formError?: string | null
  fieldErrors?: LoginFieldErrors | null
  onSubmit: (values: LoginFormValues) => void
  showGoogleOAuth?: boolean
  onGoogleContinue?: () => void
  recoverPasswordPath?: string
  createAccountPath?: string
}

export function LoginForm({
  initialEmail = '',
  loading = false,
  formError = null,
  fieldErrors = null,
  onSubmit,
  showGoogleOAuth = false,
  onGoogleContinue,
  recoverPasswordPath = '/recuperar-senha',
  createAccountPath = '/criar-conta',
}: LoginFormProps) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(Boolean(initialEmail))
  const [showPassword, setShowPassword] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    onSubmit({ email, password, rememberMe })
  }

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
      noValidate
      aria-busy={loading || undefined}
    >
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            D
          </span>
          <div>
            <p className={styles.brandName}>Drogamar</p>
            <p className={styles.brandSub}>Farmácia de Manipulação</p>
          </div>
        </div>
        <h1 className={styles.title}>Bem-vindo de volta!</h1>
        <p className={styles.subtitle}>Entre na sua conta para continuar.</p>
      </header>

      {formError ? (
        <Alert variant="danger">
          <span className={styles.errorWithIcon}>{formError}</span>
        </Alert>
      ) : null}

      <div className={styles.fields}>
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors?.email}
          disabled={loading}
          leadingIcon={<MailIcon size={16} />}
        />

        <TextField
          label="Senha"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Digite sua senha"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors?.password}
          disabled={loading}
          leadingIcon={<LockIcon size={16} />}
          trailingSlot={
            <button
              type="button"
              className={styles.iconButton}
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              aria-pressed={showPassword}
              disabled={loading}
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          }
        />
      </div>

      <div className={styles.row}>
        <Checkbox
          label="Lembrar de mim"
          checked={rememberMe}
          disabled={loading}
          onChange={(event) => setRememberMe(event.target.checked)}
        />
        <Link className={styles.link} to={recoverPasswordPath}>
          Esqueci minha senha
        </Link>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        disabled={loading}
      >
        {loading ? 'Entrando…' : 'Entrar'}
      </Button>

      {showGoogleOAuth ? (
        <>
          <div className={styles.separator} role="separator" aria-label="ou">
            <span>ou</span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            fullWidth
            disabled={loading}
            onClick={onGoogleContinue}
          >
            Continuar com Google
          </Button>
        </>
      ) : null}

      <p className={styles.footer}>
        Ainda não tem uma conta?{' '}
        <Link className={styles.linkStrong} to={createAccountPath}>
          Criar conta
        </Link>
      </p>
    </form>
  )
}
