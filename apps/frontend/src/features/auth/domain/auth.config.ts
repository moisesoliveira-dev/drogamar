/**
 * Flags de integração de autenticação.
 * Ative `googleOAuthEnabled` apenas quando o fluxo OAuth existir no backend.
 */
export const authConfig = {
  googleOAuthEnabled: false,
  /** Endpoint futuro — não inventar URL até o backend expor o contrato. */
  loginPath: null as string | null,
} as const
