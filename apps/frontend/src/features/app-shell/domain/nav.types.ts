import type { ComponentType } from 'react'

export type NavIconComponent = ComponentType<{
  size?: number
  className?: string
}>

export type NavItemConfig = {
  id: string
  label: string
  path: string
  /** Código funcional do ERP (ex.: F1) — visual/identificação, não atalho de teclado. */
  code?: string
  icon?: NavIconComponent
  description?: string
}

export type NavModuleConfig = {
  id: string
  label: string
  icon: NavIconComponent
  basePath: string
  items: NavItemConfig[]
}

export type ActiveNavState = {
  module: NavModuleConfig | null
  item: NavItemConfig | null
  breadcrumbs: Array<{ label: string; path?: string }>
}

/** Rótulo de exibição: "F2 — Alerta de Validade" quando houver código. */
export function formatNavItemLabel(item: Pick<NavItemConfig, 'label' | 'code'>): string {
  return item.code ? `${item.code} — ${item.label}` : item.label
}

/** Destino ao abrir o setor na sidebar primária. */
export function moduleEntryPath(module: NavModuleConfig): string {
  return module.items[0]?.path ?? module.basePath
}
