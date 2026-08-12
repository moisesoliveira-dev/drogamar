import { formatNavItemLabel, type NavModuleConfig } from './nav.types'

export type GlobalSearchNavHit = {
  id: string
  kind: 'page'
  title: string
  subtitle: string
  path: string
  moduleLabel: string
}

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function scoreText(haystack: string, needle: string): number {
  const h = normalize(haystack)
  const n = normalize(needle)
  if (!n || !h) return -1
  if (h === n) return 100
  if (h.startsWith(n)) return 80
  if (h.includes(n)) return 50
  const parts = n.split(/\s+/).filter(Boolean)
  if (parts.length > 1 && parts.every((p) => h.includes(p))) return 40
  return -1
}

/** Busca páginas/setores na navegação do ERP (fonte local). */
export function searchNavPages(
  modules: NavModuleConfig[],
  query: string,
  limit = 8,
): GlobalSearchNavHit[] {
  const q = query.trim()
  if (!q) return []

  const hits: Array<GlobalSearchNavHit & { score: number }> = []

  for (const module of modules) {
    const moduleScore = scoreText(module.label, q)
    for (const item of module.items) {
      const title = formatNavItemLabel(item)
      const score = Math.max(
        scoreText(item.label, q),
        scoreText(title, q),
        scoreText(item.code ?? '', q),
        scoreText(item.description ?? '', q),
        scoreText(module.label, q) * 0.5,
        moduleScore * 0.4,
      )
      if (score < 0) continue
      hits.push({
        id: `page:${module.id}:${item.id}`,
        kind: 'page',
        title,
        subtitle: item.description ?? module.label,
        path: item.path,
        moduleLabel: module.label,
        score,
      })
    }
  }

  return hits
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'pt-BR'))
    .slice(0, limit)
    .map(({ score, ...hit }) => {
      void score
      return hit
    })
}
