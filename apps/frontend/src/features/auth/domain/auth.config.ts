/**
 * Config de autenticação do frontend.
 * Tokens ficam em cookies HttpOnly definidos pelo backend — nunca em localStorage.
 */
export const authConfig = {
  googleOAuthEnabled: false,
  microsoftOAuthEnabled: false,
  loginPath: '/api/auth/login',
  refreshPath: '/api/auth/refresh',
  logoutPath: '/api/auth/logout',
  mePath: '/api/auth/me',
  /** Rota padrão após login quando não há redirect seguro. */
  defaultAuthenticatedPath: '/app',
  /** Rotas públicas relacionadas à conta (ainda sem backend completo). */
  recoverPasswordPath: '/recuperar-senha',
  createAccountPath: '/criar-conta',
} as const
