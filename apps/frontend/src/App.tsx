import { QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import {
  GuestOnlyRoute,
  ProtectedRoute,
} from './features/auth/containers/AuthRouteGuards'
import { queryClient } from './shared/lib/query-client'

const LoginPageContainer = lazy(() =>
  import('./features/auth/containers/LoginPageContainer').then((m) => ({
    default: m.LoginPageContainer,
  })),
)

const AppShellContainer = lazy(() =>
  import('./features/app-shell').then((m) => ({
    default: m.AppShellContainer,
  })),
)

const ModulePlaceholderPage = lazy(() =>
  import('./features/app-shell').then((m) => ({
    default: m.ModulePlaceholderPage,
  })),
)

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        color: 'var(--fm-text)',
        background: 'var(--fm-surface)',
      }}
    >
      <p style={{ margin: 0, color: 'var(--fm-muted)' }}>{title}</p>
    </main>
  )
}

function RouteFallback() {
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route
              path="/login"
              element={
                <Suspense fallback={<RouteFallback />}>
                  <LoginPageContainer />
                </Suspense>
              }
            />
            <Route
              path="/recuperar-senha"
              element={
                <GuestOnlyRoute>
                  <PlaceholderPage title="Recuperação de senha em breve." />
                </GuestOnlyRoute>
              }
            />
            <Route
              path="/criar-conta"
              element={
                <GuestOnlyRoute>
                  <PlaceholderPage title="Criação de conta em breve." />
                </GuestOnlyRoute>
              }
            />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<RouteFallback />}>
                    <AppShellContainer />
                  </Suspense>
                </ProtectedRoute>
              }
            >
              <Route
                index
                element={
                  <Suspense fallback={null}>
                    <ModulePlaceholderPage />
                  </Suspense>
                }
              />
              <Route
                path="dashboard"
                element={<Navigate to="/app" replace />}
              />
              <Route
                path="*"
                element={
                  <Suspense fallback={null}>
                    <ModulePlaceholderPage />
                  </Suspense>
                }
              />
            </Route>
            <Route path="/" element={<Navigate to="/app" replace />} />
            <Route path="*" element={<Navigate to="/app" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
