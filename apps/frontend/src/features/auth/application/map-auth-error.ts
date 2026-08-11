import {
  AuthNetworkError,
  AuthServiceUnavailableError,
  InvalidCredentialsError,
} from '../domain/errors'

export function mapAuthError(error: unknown): string {
  if (error instanceof InvalidCredentialsError) {
    return 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.'
  }

  if (error instanceof AuthNetworkError) {
    return 'Não foi possível conectar. Verifique sua internet e tente novamente.'
  }

  if (error instanceof AuthServiceUnavailableError) {
    return 'Não foi possível entrar agora. Tente novamente em alguns instantes.'
  }

  return 'Algo deu errado ao entrar. Tente novamente.'
}
