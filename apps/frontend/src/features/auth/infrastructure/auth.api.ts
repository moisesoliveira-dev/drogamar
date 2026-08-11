import { authConfig } from '../domain/auth.config'
import {
  AuthNetworkError,
  AuthServiceUnavailableError,
  InvalidCredentialsError,
} from '../domain/errors'
import type { LoginInput } from '../domain/login.schema'

export type AuthSession = {
  accessToken: string
  user: {
    id: string
    email: string
    name: string
  }
}

/**
 * Port de autenticação (infrastructure adapter).
 * Quando o backend existir, implementar a chamada HTTP em `loginPath`.
 */
export async function loginRequest(
  credentials: LoginInput,
): Promise<AuthSession> {
  if (!authConfig.loginPath) {
    void credentials
    throw new AuthServiceUnavailableError()
  }

  try {
    const response = await fetch(authConfig.loginPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        email: credentials.email,
        password: credentials.password,
        rememberMe: credentials.rememberMe,
      }),
    })

    if (response.status === 401 || response.status === 403) {
      throw new InvalidCredentialsError()
    }

    if (!response.ok) {
      throw new AuthServiceUnavailableError()
    }

    return (await response.json()) as AuthSession
  } catch (error) {
    if (
      error instanceof InvalidCredentialsError ||
      error instanceof AuthServiceUnavailableError
    ) {
      throw error
    }
    throw new AuthNetworkError()
  }
}
