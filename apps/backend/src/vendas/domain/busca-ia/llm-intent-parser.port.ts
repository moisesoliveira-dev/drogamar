import type { SearchIntent } from './search-intent';

export type LlmCatalogHints = {
  categories: string[];
  brands: string[];
};

/**
 * Port de interpretação via LLM.
 * Só pode devolver filtros — nunca produtos.
 */
export interface LlmIntentParser {
  readonly enabled: boolean;
  parse(query: string, hints: LlmCatalogHints): Promise<SearchIntent | null>;
}
