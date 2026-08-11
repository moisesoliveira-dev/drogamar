import { authConfig } from '../domain/auth.config'

/**
 * Evita open redirect: só paths relativos internos, sem protocolo/host.
 */
export function resolveSafeRedirect(
  candidate: string | null | undefined,
  fallback: string = authConfig.defaultAuthenticatedPath,
): string {
  if (!candidate) return fallback

  const value = candidate.trim()
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  if (value.includes('://')) return fallback
  if (value.includes('\\')) return fallback
  if (/[\r\n]/.test(value)) return fallback
  if (value.startsWith('/login')) return fallback
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return fallback

  return value
}

/** Alias usado em pontos da feature. */
export function getSafeRedirect(
  candidate: string | null | undefined,
  fallback: string = authConfig.defaultAuthenticatedPath,
): string {
  return resolveSafeRedirect(candidate, fallback)
}

export function buildLoginPath(from?: string | null): string {
  const safe = from ? resolveSafeRedirect(from, '') : ''
  if (!safe) return '/login'
  return `/login?redirect=${encodeURIComponent(safe)}`
}
