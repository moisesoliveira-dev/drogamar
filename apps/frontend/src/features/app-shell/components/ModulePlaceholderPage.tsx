import { useLocation } from 'react-router-dom'
import { resolveActiveNav } from '../application/resolve-active-nav'
import { formatNavItemLabel } from '../domain/nav.types'
import { PageHeader } from './PageHeader'
import styles from './ModulePlaceholderPage.module.css'

/**
 * Placeholder genérico para páginas do ERP.
 * Título/descrição derivados da rota via config de navegação.
 */
export function ModulePlaceholderPage() {
  const { pathname } = useLocation()
  const { module, item, breadcrumbs } = resolveActiveNav(pathname)

  const title = item
    ? formatNavItemLabel(item)
    : (module?.label ?? 'Página')
  const description =
    item?.description ??
    'Esta área estará disponível em uma próxima entrega.'

  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        description={description}
      />
      <section className={styles.panel} aria-label={title}>
        <p className={styles.kicker}>Em construção</p>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>
          Shell autenticado ativo
          {module ? ` no setor ${module.label}` : ''}. O conteúdo funcional
          deste módulo será implementado nas próximas etapas.
        </p>
      </section>
    </>
  )
}
