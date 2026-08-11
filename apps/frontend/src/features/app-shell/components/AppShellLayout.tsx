import type { ReactNode } from 'react'
import styles from './AppShellLayout.module.css'

export type AppShellLayoutProps = {
  topbar: ReactNode
  primarySidebar: ReactNode
  secondarySidebar: ReactNode
  children: ReactNode
  primaryOpen: boolean
  secondaryOpen: boolean
  onCloseDrawers: () => void
}

export function AppShellLayout({
  topbar,
  primarySidebar,
  secondarySidebar,
  children,
  primaryOpen,
  secondaryOpen,
  onCloseDrawers,
}: AppShellLayoutProps) {
  const drawerOpen = primaryOpen || secondaryOpen

  const shellClass = [
    styles.shell,
    primaryOpen ? styles.primaryOpen : '',
    secondaryOpen ? styles.secondaryOpen : '',
    drawerOpen ? styles.drawerOpen : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={shellClass}>
      <a className={styles.skipLink} href="#conteudo-principal">
        Ir para o conteúdo
      </a>
      <header className={styles.topbar}>{topbar}</header>
      <aside className={styles.primary} aria-label="Setores do sistema">
        {primarySidebar}
      </aside>
      <aside className={styles.secondary} aria-label="Menu do setor">
        {secondarySidebar}
      </aside>
      <div className={styles.main}>
        <div className={styles.mainScroll} id="conteudo-principal">
          {children}
        </div>
      </div>
      <button
        type="button"
        className={styles.overlay}
        aria-label="Fechar menu de navegação"
        tabIndex={drawerOpen ? 0 : -1}
        onClick={onCloseDrawers}
      />
    </div>
  )
}
