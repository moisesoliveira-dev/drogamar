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

const ItemsListContainer = lazy(() =>
  import('./features/estoque-itens').then((m) => ({
    default: m.ItemsListContainer,
  })),
)

const ItemFormContainer = lazy(() =>
  import('./features/estoque-itens').then((m) => ({
    default: m.ItemFormContainer,
  })),
)

const ItemDetailContainer = lazy(() =>
  import('./features/estoque-itens').then((m) => ({
    default: m.ItemDetailContainer,
  })),
)

const ExpiryAlertsContainer = lazy(() =>
  import('./features/estoque-validade').then((m) => ({
    default: m.ExpiryAlertsContainer,
  })),
)

const ExportacaoContainer = lazy(() =>
  import('./features/estoque-exportacao').then((m) => ({
    default: m.ExportacaoContainer,
  })),
)

const LojaOnlineContainer = lazy(() =>
  import('./features/estoque-loja-online').then((m) => ({
    default: m.LojaOnlineContainer,
  })),
)

const CarrinhoContainer = lazy(() =>
  import('./features/vendas-carrinho').then((m) => ({
    default: m.CarrinhoContainer,
  })),
)

const CodigoBarrasContainer = lazy(() =>
  import('./features/vendas-codigo-barras').then((m) => ({
    default: m.CodigoBarrasContainer,
  })),
)

const PagamentosContainer = lazy(() =>
  import('./features/vendas-pagamentos').then((m) => ({
    default: m.PagamentosContainer,
  })),
)

const BalcaoContainer = lazy(() =>
  import('./features/vendas-balcao').then((m) => ({
    default: m.BalcaoContainer,
  })),
)

const BuscaIaContainer = lazy(() =>
  import('./features/vendas-busca-ia').then((m) => ({
    default: m.BuscaIaContainer,
  })),
)

const DescontosContainer = lazy(() =>
  import('./features/vendas-descontos').then((m) => ({
    default: m.DescontosContainer,
  })),
)

const ContasReceberContainer = lazy(() =>
  import('./features/financeiro-contas-receber').then((m) => ({
    default: m.ContasReceberContainer,
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

function ItemCreatePage() {
  return <ItemFormContainer mode="create" />
}

function ItemEditPage() {
  return <ItemFormContainer mode="edit" />
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
                path="estoque"
                element={<Navigate to="/app/estoque/itens" replace />}
              />
              <Route
                path="estoque/itens"
                element={
                  <Suspense fallback={null}>
                    <ItemsListContainer />
                  </Suspense>
                }
              />
              <Route
                path="estoque/itens/novo"
                element={
                  <Suspense fallback={null}>
                    <ItemCreatePage />
                  </Suspense>
                }
              />
              <Route
                path="estoque/itens/:id"
                element={
                  <Suspense fallback={null}>
                    <ItemDetailContainer />
                  </Suspense>
                }
              />
              <Route
                path="estoque/itens/:id/editar"
                element={
                  <Suspense fallback={null}>
                    <ItemEditPage />
                  </Suspense>
                }
              />
              <Route
                path="estoque/validade"
                element={
                  <Suspense fallback={null}>
                    <ExpiryAlertsContainer />
                  </Suspense>
                }
              />
              <Route
                path="estoque/exportacao"
                element={
                  <Suspense fallback={null}>
                    <ExportacaoContainer />
                  </Suspense>
                }
              />
              <Route
                path="estoque/loja-online"
                element={
                  <Suspense fallback={null}>
                    <LojaOnlineContainer />
                  </Suspense>
                }
              />
              <Route
                path="vendas"
                element={<Navigate to="/app/vendas/carrinho" replace />}
              />
              <Route
                path="comercial"
                element={<Navigate to="/app/vendas/carrinho" replace />}
              />
              <Route
                path="comercial/*"
                element={<Navigate to="/app/vendas/carrinho" replace />}
              />
              <Route
                path="vendas/carrinho"
                element={
                  <Suspense fallback={null}>
                    <CarrinhoContainer />
                  </Suspense>
                }
              />
              <Route
                path="vendas/codigo-barras"
                element={
                  <Suspense fallback={null}>
                    <CodigoBarrasContainer />
                  </Suspense>
                }
              />
              <Route
                path="vendas/pagamentos"
                element={
                  <Suspense fallback={null}>
                    <PagamentosContainer />
                  </Suspense>
                }
              />
              <Route
                path="vendas/balcao"
                element={
                  <Suspense fallback={null}>
                    <BalcaoContainer />
                  </Suspense>
                }
              />
              <Route
                path="vendas/busca-ia"
                element={
                  <Suspense fallback={null}>
                    <BuscaIaContainer />
                  </Suspense>
                }
              />
              <Route
                path="vendas/descontos"
                element={
                  <Suspense fallback={null}>
                    <DescontosContainer />
                  </Suspense>
                }
              />
              <Route
                path="financeiro"
                element={<Navigate to="/app/financeiro/contas-receber" replace />}
              />
              <Route
                path="financeiro/contas-receber"
                element={
                  <Suspense fallback={null}>
                    <ContasReceberContainer />
                  </Suspense>
                }
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
