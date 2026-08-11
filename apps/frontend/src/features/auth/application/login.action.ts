import {
  loginSchema,
  type LoginFieldErrors,
  type LoginInput,
} from '../domain/login.schema'
import {
  loginRequest,
  type AuthSession,
} from '../infrastructure/auth.api'
import { mapAuthError } from './map-auth-error'

export type LoginActionResult =
  | { ok: true; session: AuthSession; data: LoginInput }
  | {
      ok: false
      fieldErrors: LoginFieldErrors | null
      formError: string | null
    }

export async function loginAction(input: unknown): Promise<LoginActionResult> {
  const parsed = loginSchema.safeParse(input)

  if (!parsed.success) {
    const fieldErrors: LoginFieldErrors = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]
      if (
        (key === 'email' || key === 'password' || key === 'rememberMe') &&
        !fieldErrors[key]
      ) {
        fieldErrors[key] = issue.message
      }
    }
    return { ok: false, fieldErrors, formError: null }
  }

  try {
    const session = await loginRequest(parsed.data)
    return { ok: true, session, data: parsed.data }
  } catch (error) {
    return {
      ok: false,
      fieldErrors: null,
      formError: mapAuthError(error),
    }
  }
}
