import { useEffect, type ReactNode } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { getSafeRedirect } from '../application/safe-redirect'
import { authConfig } from '../domain/auth.config'
import { fetchCurrentUser } from '../infrastructure/auth.api'
import { useAuthStore } from '../stores/auth.store'

type Props = {
  children: ReactNode
}

export function ProtectedRoute({ children }: Props) {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const bootstrapped = useAuthStore((s) => s.bootstrapped)
  const setUser = useAuthStore((s) => s.setUser)
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped)

  useEffect(() => {
    let active = true
    if (bootstrapped) return

    void (async () => {
      const current = await fetchCurrentUser()
      if (!active) return
      setUser(current)
      setBootstrapped(true)
    })()

    return () => {
      active = false
    }
  }, [bootstrapped, setBootstrapped, setUser])

  if (!bootstrapped) {
    return (
      <main
        style={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--fm-surface)',
          color: 'var(--fm-muted)',
        }}
      >
        Carregando…
      </main>
    )
  }

  if (!user) {
    const redirect = `${location.pathname}${location.search}`
    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    )
  }

  return children
}

export function GuestOnlyRoute({ children }: Props) {
  const user = useAuthStore((s) => s.user)
  const bootstrapped = useAuthStore((s) => s.bootstrapped)
  const setUser = useAuthStore((s) => s.setUser)
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped)
  const [params] = useSearchParams()

  useEffect(() => {
    let active = true
    if (bootstrapped) return

    void (async () => {
      const current = await fetchCurrentUser()
      if (!active) return
      setUser(current)
      setBootstrapped(true)
    })()

    return () => {
      active = false
    }
  }, [bootstrapped, setBootstrapped, setUser])

  if (!bootstrapped) {
    return (
      <main
        style={{
          minHeight: '100svh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--fm-surface)',
          color: 'var(--fm-muted)',
        }}
      >
        Carregando…
      </main>
    )
  }

  if (user) {
    return (
      <Navigate
        to={getSafeRedirect(
          params.get('redirect'),
          authConfig.defaultAuthenticatedPath,
        )}
        replace
      />
    )
  }

  return children
}
