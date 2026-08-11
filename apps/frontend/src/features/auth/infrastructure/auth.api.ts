import { authConfig } from '../domain/auth.config'
import {
  AccountUnavailableError,
  AuthNetworkError,
  AuthRateLimitedError,
  AuthServiceUnavailableError,
  AuthValidationError,
  InvalidCredentialsError,
  SessionExpiredError,
} from '../domain/errors'
import {
  loginResponseSchema,
  type AuthUser,
  type LoginInput,
} from '../domain/login.schema'
import { authLog } from './auth.logger'

async function parseError(response: Response): Promise<never> {
  let code: string | undefined
  try {
    const body = (await response.json()) as {
      code?: string
      message?: string
      statusCode?: number
    }
    code = body.code
  } catch {
    // ignore body parse
  }

  if (response.status === 400 || response.status === 422) {
    throw new AuthValidationError()
  }
  if (response.status === 401) {
    if (code === 'SESSION_EXPIRED') throw new SessionExpiredError()
    throw new InvalidCredentialsError()
  }
  if (response.status === 403) {
    throw new AccountUnavailableError()
  }
  if (response.status === 429) {
    throw new AuthRateLimitedError()
  }
  if (response.status >= 500) {
    throw new AuthServiceUnavailableError()
  }
  throw new AuthServiceUnavailableError()
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    authLog('network_error', { path })
    throw new AuthNetworkError()
  }
}

/**
 * Adapter HTTP de autenticação.
 * Sessão via cookies HttpOnly (Secure + SameSite no backend).
 * Nenhum token é persistido no JavaScript.
 */
export async function loginRequest(credentials: LoginInput): Promise<AuthUser> {
  authLog('login_attempt')

  const response = await authFetch(authConfig.loginPath, {
    method: 'POST',
    body: JSON.stringify({
      email: credentials.email,
      password: credentials.password,
      rememberMe: credentials.rememberMe,
    }),
  })

  if (!response.ok) {
    authLog('login_failure', { status: response.status })
    await parseError(response)
  }

  const json: unknown = await response.json()
  const parsed = loginResponseSchema.safeParse(json)
  if (!parsed.success) {
    authLog('login_failure', { reason: 'invalid_response_shape' })
    throw new AuthServiceUnavailableError()
  }

  authLog('login_success')
  return parsed.data.user
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const response = await authFetch(authConfig.mePath, { method: 'GET' })
  if (response.status === 401) {
    const refreshed = await refreshSession()
    return refreshed
  }
  if (!response.ok) {
    return null
  }
  const json: unknown = await response.json()
  const parsed = loginResponseSchema.safeParse(json)
  return parsed.success ? parsed.data.user : null
}

export async function refreshSession(): Promise<AuthUser | null> {
  const response = await authFetch(authConfig.refreshPath, { method: 'POST' })
  if (!response.ok) {
    authLog('session_expired')
    return null
  }
  const json: unknown = await response.json()
  const parsed = loginResponseSchema.safeParse(json)
  return parsed.success ? parsed.data.user : null
}

export async function logoutRequest(): Promise<void> {
  try {
    await authFetch(authConfig.logoutPath, { method: 'POST' })
  } finally {
    authLog('logout')
  }
}
