import type { ReactNode } from 'react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BellIcon,
  ChevronDownIcon,
  HelpIcon,
  LogoutIcon,
  MenuIcon,
  SettingsIcon,
} from '../../../shared/ui/icons'
import styles from './Topbar.module.css'

export type TopbarUser = {
  name: string
  email: string
}

export type TopbarProps = {
  user: TopbarUser | null
  onToggleNav: () => void
  onLogout: () => void
  loggingOut?: boolean
  search?: ReactNode
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

export function Topbar({
  user,
  onToggleNav,
  onLogout,
  loggingOut = false,
  search,
}: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return

    function onPointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  return (
    <div className={styles.topbar}>
      <div className={styles.left}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Abrir navegação"
          onClick={onToggleNav}
        >
          <MenuIcon size={18} />
        </button>
        <Link to="/app" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            DM
          </span>
          <span className={styles.brandName}>Drogamar</span>
        </Link>
      </div>

      <div className={styles.center}>{search}</div>

      <div className={styles.right}>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Notificações"
        >
          <BellIcon size={18} />
        </button>
        <button
          type="button"
          className={styles.iconButton}
          aria-label="Ajuda e suporte"
        >
          <HelpIcon size={18} />
        </button>

        <div className={styles.userWrap} ref={wrapRef}>
          <button
            type="button"
            className={styles.userButton}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className={styles.avatar} aria-hidden="true">
              {initials(user?.name ?? 'Usuário')}
            </span>
            {user ? (
              <span className={styles.userMeta}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userEmail}>{user.email}</span>
              </span>
            ) : null}
            <ChevronDownIcon className={styles.chevron} size={14} />
          </button>

          {menuOpen ? (
            <ul className={styles.menu} id={menuId} role="menu">
              <li role="none">
                <button type="button" className={styles.menuItem} role="menuitem">
                  Meu perfil
                </button>
              </li>
              <li role="none">
                <button type="button" className={styles.menuItem} role="menuitem">
                  Preferências
                </button>
              </li>
              <li role="none">
                <button type="button" className={styles.menuItem} role="menuitem">
                  <SettingsIcon size={14} />
                  Configurações
                </button>
              </li>
              <li className={styles.menuSep} role="separator" />
              <li role="none">
                <button
                  type="button"
                  className={styles.menuDanger}
                  role="menuitem"
                  disabled={loggingOut}
                  onClick={() => {
                    setMenuOpen(false)
                    onLogout()
                  }}
                >
                  <LogoutIcon size={14} />
                  {loggingOut ? 'Saindo…' : 'Sair'}
                </button>
              </li>
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  )
}
