import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPageContainer } from './features/auth'
import { queryClient } from './shared/lib/query-client'

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPageContainer />} />
          <Route
            path="/recuperar-senha"
            element={<PlaceholderPage title="Recuperação de senha em breve." />}
          />
          <Route
            path="/criar-conta"
            element={<PlaceholderPage title="Criação de conta em breve." />}
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
