import { appModules } from '../domain/nav.config'
import {
  formatNavItemLabel,
  type ActiveNavState,
  type NavItemConfig,
  type NavModuleConfig,
} from '../domain/nav.types'

function scoreMatch(pathname: string, path: string): number {
  if (pathname === path) return 1000 + path.length
  if (path !== '/app' && pathname.startsWith(`${path}/`)) return path.length
  return -1
}

function resolveItem(
  module: NavModuleConfig,
  pathname: string,
): NavItemConfig | null {
  let best: NavItemConfig | null = null
  let bestScore = -1
  for (const item of module.items) {
    const score = scoreMatch(pathname, item.path)
    if (score > bestScore) {
      best = item
      bestScore = score
    }
  }
  return bestScore >= 0 ? best : module.items[0] ?? null
}

/**
 * Deriva setor/página ativos a partir da URL — fonte única de verdade.
 */
export function resolveActiveNav(pathname: string): ActiveNavState {
  let bestModule: NavModuleConfig | null = null
  let bestScore = -1

  for (const module of appModules) {
    const score = scoreMatch(pathname, module.basePath)
    if (score > bestScore) {
      bestModule = module
      bestScore = score
    }
  }

  // Fallback: Início
  const module = bestModule ?? appModules[0] ?? null
  if (!module) {
    return { module: null, item: null, breadcrumbs: [] }
  }

  const item = resolveItem(module, pathname)
  const breadcrumbs =
    module.id === 'inicio'
      ? [{ label: item ? formatNavItemLabel(item) : 'Dashboard' }]
      : [
          {
            label: module.label,
            path: module.items[0]?.path ?? module.basePath,
          },
          ...(item ? [{ label: formatNavItemLabel(item) }] : []),
        ]

  return { module, item, breadcrumbs }
}
