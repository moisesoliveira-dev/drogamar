import type { ComponentType } from 'react'

export type NavIconComponent = ComponentType<{
  size?: number
  className?: string
}>

export type NavItemConfig = {
  id: string
  label: string
  path: string
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
