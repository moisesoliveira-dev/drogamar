type AuthLogEvent =
  | 'login_attempt'
  | 'login_success'
  | 'login_failure'
  | 'network_error'
  | 'session_expired'
  | 'logout'

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'authorization',
  'cookie',
  'cookies',
])

function sanitize(meta?: Record<string, unknown>) {
  if (!meta) return undefined
  const clean: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue
    if (typeof value === 'string' && value.length > 200) {
      clean[key] = `${value.slice(0, 200)}…`
      continue
    }
    clean[key] = value
  }
  return clean
}

/** Logger seguro — nunca registra senhas, tokens ou headers Authorization. */
export function authLog(
  event: AuthLogEvent,
  meta?: Record<string, unknown>,
): void {
  if (import.meta.env.DEV) {
    console.info(`[auth] ${event}`, sanitize(meta) ?? {})
  }
  // Ponto de extensão para telemetria futura (Sentry, etc.)
}
