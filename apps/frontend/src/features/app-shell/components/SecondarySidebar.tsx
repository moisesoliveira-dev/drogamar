import { NavLink } from 'react-router-dom'
import {
  formatNavItemLabel,
  type NavItemConfig,
  type NavModuleConfig,
} from '../domain/nav.types'
import styles from './SecondarySidebar.module.css'

export type SecondarySidebarProps = {
  module: NavModuleConfig | null
  activeItemId: string | null
  onNavigate?: (item: NavItemConfig) => void
}

export function SecondarySidebar({
  module,
  activeItemId,
  onNavigate,
}: SecondarySidebarProps) {
  if (!module) {
    return (
      <div className={styles.sidebar}>
        <p className={styles.empty}>Selecione um setor.</p>
      </div>
    )
  }

  return (
    <nav className={styles.sidebar} aria-label={`Menu ${module.label}`}>
      <div className={styles.header}>
        <h2 className={styles.title}>{module.label}</h2>
      </div>
      <ul className={styles.list}>
        {module.items.map((item) => {
          const isActive = item.id === activeItemId
          const Icon = item.icon
          const displayLabel = formatNavItemLabel(item)
          return (
            <li key={item.id}>
              <NavLink
                to={item.path}
                end
                className={() =>
                  [styles.link, isActive ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')
                }
                aria-label={displayLabel}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onNavigate?.(item)}
              >
                {Icon ? (
                  <span className={styles.icon} aria-hidden="true">
                    <Icon size={16} />
                  </span>
                ) : null}
                <span className={styles.label}>
                  {item.code ? (
                    <span className={styles.code}>{item.code}</span>
                  ) : null}
                  <span className={styles.text}>{item.label}</span>
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
