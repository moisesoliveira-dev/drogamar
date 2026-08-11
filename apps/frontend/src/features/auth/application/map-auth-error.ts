import {
  AccountUnavailableError,
  AuthNetworkError,
  AuthRateLimitedError,
  AuthServiceUnavailableError,
  AuthValidationError,
  InvalidCredentialsError,
  SessionExpiredError,
} from '../domain/errors'

export function mapAuthError(error: unknown): string {
  if (error instanceof InvalidCredentialsError) {
    return 'Não foi possível entrar. Verifique seu e-mail e senha.'
  }

  if (error instanceof AccountUnavailableError) {
    return 'Você não possui permissão para acessar este sistema.'
  }

  if (error instanceof AuthValidationError) {
    return 'Verifique os dados informados.'
  }

  if (error instanceof AuthRateLimitedError) {
    return 'Muitas tentativas. Aguarde alguns instantes e tente novamente.'
  }

  if (error instanceof SessionExpiredError) {
    return 'Sua sessão expirou. Entre novamente.'
  }

  if (error instanceof AuthNetworkError) {
    return 'Não foi possível conectar ao servidor.'
  }

  if (error instanceof AuthServiceUnavailableError) {
    return 'Não foi possível concluir o login. Tente novamente.'
  }

  return 'Não foi possível concluir o login. Tente novamente.'
}
