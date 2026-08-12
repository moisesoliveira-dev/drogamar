export type SearchIntent = {
  raw: string;
  search: string | null;
  categoryName: string | null;
  brandName: string | null;
  priceMin: number | null;
  priceMax: number | null;
  inStock: boolean | null;
  similarTo: string | null;
};

export function emptyIntent(raw: string): SearchIntent {
  return {
    raw,
    search: null,
    categoryName: null,
    brandName: null,
    priceMin: null,
    priceMax: null,
    inStock: null,
    similarTo: null,
  };
}

export function hasStructuredFilters(intent: SearchIntent): boolean {
  return Boolean(
    intent.categoryName ||
    intent.brandName ||
    intent.priceMin != null ||
    intent.priceMax != null ||
    intent.inStock != null ||
    intent.similarTo ||
    intent.search,
  );
}
