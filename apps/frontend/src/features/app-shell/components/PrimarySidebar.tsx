import { NavLink } from 'react-router-dom'
import { moduleEntryPath, type NavModuleConfig } from '../domain/nav.types'
import styles from './PrimarySidebar.module.css'

export type PrimarySidebarProps = {
  modules: NavModuleConfig[]
  activeModuleId: string | null
  onSelectModule: () => void
}

export function PrimarySidebar({
  modules,
  activeModuleId,
  onSelectModule,
}: PrimarySidebarProps) {
  return (
    <nav className={styles.sidebar} aria-label="Setores">
      <ul className={styles.list}>
        {modules.map((module) => {
          const Icon = module.icon
          const isActive = module.id === activeModuleId
          return (
            <li key={module.id}>
              <NavLink
                to={moduleEntryPath(module)}
                end={module.basePath === '/app'}
                className={() =>
                  [styles.item, isActive ? styles.active : '']
                    .filter(Boolean)
                    .join(' ')
                }
                aria-label={module.label}
                aria-current={isActive ? 'true' : undefined}
                title={module.label}
                onClick={onSelectModule}
              >
                <Icon size={18} />
                <span className={styles.tooltip} role="tooltip">
                  {module.label}
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
