import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loginAction } from '../application/login.action'
import { getSafeRedirect } from '../application/safe-redirect'
import { LoginForm, type LoginFormValues } from '../components/LoginForm'
import { LoginPage } from '../components/LoginPage'
import { authConfig } from '../domain/auth.config'
import type { LoginFieldErrors } from '../domain/login.schema'
import { useAuthStore } from '../stores/auth.store'
import { GuestOnlyRoute } from './AuthRouteGuards'

export function LoginPageContainer() {
  return (
    <GuestOnlyRoute>
      <LoginPageView />
    </GuestOnlyRoute>
  )
}

function LoginPageView() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rememberedEmail = useAuthStore((state) => state.rememberedEmail)
  const setRememberedEmail = useAuthStore((state) => state.setRememberedEmail)
  const clearRememberedEmail = useAuthStore(
    (state) => state.clearRememberedEmail,
  )
  const setUser = useAuthStore((state) => state.setUser)

  const loginMutation = useMutation({
    mutationFn: async (values: LoginFormValues) => loginAction(values),
    onSuccess: (result) => {
      if (!result.ok) return

      if (result.data.rememberMe) {
        setRememberedEmail(result.data.email)
      } else {
        clearRememberedEmail()
      }

      setUser(result.user)
      const target = getSafeRedirect(
        searchParams.get('redirect'),
        authConfig.defaultAuthenticatedPath,
      )
      navigate(target, { replace: true })
    },
  })

  const actionResult = loginMutation.data
  const fieldErrors: LoginFieldErrors | null =
    actionResult && !actionResult.ok ? actionResult.fieldErrors : null
  const formError =
    actionResult && !actionResult.ok ? actionResult.formError : null

  return (
    <LoginPage>
      <LoginForm
        key={rememberedEmail || 'login'}
        initialEmail={rememberedEmail}
        loading={loginMutation.isPending}
        fieldErrors={fieldErrors}
        formError={formError}
        showGoogleOAuth={authConfig.googleOAuthEnabled}
        recoverPasswordPath={authConfig.recoverPasswordPath}
        createAccountPath={authConfig.createAccountPath}
        onSubmit={(values) => {
          if (loginMutation.isPending) return
          loginMutation.reset()
          loginMutation.mutate(values)
        }}
      />
    </LoginPage>
  )
}
