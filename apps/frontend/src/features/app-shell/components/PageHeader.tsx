import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './PageHeader.module.css'

export type BreadcrumbItem = {
  label: string
  path?: string
}

export type PageHeaderProps = {
  breadcrumbs?: BreadcrumbItem[]
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({
  breadcrumbs = [],
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.meta}>
        {breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumb">
            <ol className={styles.breadcrumb}>
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1
                return (
                  <li key={`${crumb.label}-${index}`}>
                    {index > 0 ? (
                      <span className={styles.sep} aria-hidden="true">
                        /
                      </span>
                    ) : null}
                    {crumb.path && !isLast ? (
                      <Link className={styles.crumbLink} to={crumb.path}>
                        {crumb.label}
                      </Link>
                    ) : (
                      <span aria-current={isLast ? 'page' : undefined}>
                        {crumb.label}
                      </span>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        ) : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  )
}
