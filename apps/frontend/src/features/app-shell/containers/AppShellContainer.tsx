import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { logoutAction, useAuthStore } from '../../auth'
import { resolveActiveNav } from '../application/resolve-active-nav'
import { appModules } from '../domain/nav.config'
import { AppShellLayout } from '../components/AppShellLayout'
import { PrimarySidebar } from '../components/PrimarySidebar'
import { SecondarySidebar } from '../components/SecondarySidebar'
import { Topbar } from '../components/Topbar'

export function AppShellContainer() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((state) => state.user)
  const [primaryOpen, setPrimaryOpen] = useState(false)
  const [secondaryOpen, setSecondaryOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const active = resolveActiveNav(location.pathname)

  function closeDrawers() {
    setPrimaryOpen(false)
    setSecondaryOpen(false)
  }

  function handleToggleNav() {
    if (primaryOpen || secondaryOpen) {
      closeDrawers()
      return
    }
    setPrimaryOpen(true)
    setSecondaryOpen(true)
  }

  function handleSelectModule() {
    setPrimaryOpen(true)
    setSecondaryOpen(true)
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logoutAction()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <AppShellLayout
      primaryOpen={primaryOpen}
      secondaryOpen={secondaryOpen}
      onCloseDrawers={closeDrawers}
      topbar={
        <Topbar
          user={user}
          onToggleNav={handleToggleNav}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      }
      primarySidebar={
        <PrimarySidebar
          modules={appModules}
          activeModuleId={active.module?.id ?? null}
          onSelectModule={handleSelectModule}
        />
      }
      secondarySidebar={
        <SecondarySidebar
          module={active.module}
          activeItemId={active.item?.id ?? null}
          onNavigate={closeDrawers}
        />
      }
    >
      <Outlet />
    </AppShellLayout>
  )
}
