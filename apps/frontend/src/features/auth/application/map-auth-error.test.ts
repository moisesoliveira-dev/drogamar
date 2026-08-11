import { describe, expect, it } from 'vitest'
import {
  AccountUnavailableError,
  AuthNetworkError,
  AuthRateLimitedError,
  AuthServiceUnavailableError,
  AuthValidationError,
  InvalidCredentialsError,
  SessionExpiredError,
} from '../domain/errors'
import { mapAuthError } from './map-auth-error'

describe('mapAuthError', () => {
  it('mapeia credenciais inválidas sem revelar existência de conta', () => {
    expect(mapAuthError(new InvalidCredentialsError())).toBe(
      'Não foi possível entrar. Verifique seu e-mail e senha.',
    )
  })

  it('mapeia demais status HTTP para mensagens amigáveis', () => {
    expect(mapAuthError(new AuthValidationError())).toMatch(/dados informados/i)
    expect(mapAuthError(new AccountUnavailableError())).toMatch(/permissão/i)
    expect(mapAuthError(new AuthRateLimitedError())).toMatch(/Muitas tentativas/i)
    expect(mapAuthError(new AuthServiceUnavailableError())).toMatch(/Tente novamente/i)
    expect(mapAuthError(new AuthNetworkError())).toMatch(/conectar/i)
    expect(mapAuthError(new SessionExpiredError())).toMatch(/sessão expirou/i)
  })
})
