import { emptyIntent, type SearchIntent } from './search-intent';

const STOPWORDS = new Set([
  'quero',
  'queria',
  'mostrar',
  'mostre',
  'mostra',
  'procure',
  'procurar',
  'busca',
  'buscar',
  'tem',
  'têm',
  'algum',
  'alguma',
  'alguns',
  'algumas',
  'produto',
  'produtos',
  'item',
  'itens',
  'um',
  'uma',
  'uns',
  'umas',
  'o',
  'a',
  'os',
  'as',
  'de',
  'da',
  'do',
  'das',
  'dos',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'com',
  'para',
  'pra',
  'que',
  'quais',
  'qual',
  'este',
  'esta',
  'isso',
  'algo',
  'por',
  'reais',
  'real',
  'rs',
]);

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[“”"'`]/g, '')
    .replace(/[?!]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseMoneyToken(raw: string): number | null {
  const cleaned = raw.replace(/[r$\s]/gi, '').replace(',', '.');
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function extractQuoted(text: string): { value: string | null; rest: string } {
  const match = text.match(/["“']([^"”']+)["”']/);
  if (!match?.[1]) return { value: null, rest: text };
  return {
    value: match[1].trim(),
    rest: text.replace(match[0], ' ').replace(/\s+/g, ' ').trim(),
  };
}

function remainderToSearch(text: string): string | null {
  const tokens = normalize(text)
    .split(' ')
    .map((t) => t.replace(/[.,;:!?]+$/g, ''))
    .filter(
      (t) => t.length > 1 && !STOPWORDS.has(t) && !/^\d+([.,]\d+)?$/.test(t),
    );
  const joined = tokens.join(' ').trim();
  return joined || null;
}

/**
 * Interpreta PT-BR em filtros estruturados. Não acessa I/O nem gera SQL.
 */
export function parseSearchIntent(rawQuery: string): SearchIntent {
  const raw = rawQuery.trim();
  const intent = emptyIntent(raw);
  if (!raw) return intent;

  let text = normalize(raw);

  const similar = text.match(
    /(?:parecido|parecida|similar|semelhante)\s+(?:com|a|ao|à)?\s*(.+)$/i,
  );
  if (similar?.[1]) {
    intent.similarTo = similar[1].trim();
    text = text.replace(similar[0], ' ').trim();
  }

  const brandQuoted = text.match(/(?:da\s+marca|marca)\s+["“']([^"”']+)["”']/i);
  const brandPlain = text.match(
    /(?:da\s+marca|marca)\s+([a-z0-9][\wÀ-ÿ\- ]{1,40}?)(?=\s+(?:abaixo|acima|ate|até|com|em|sem|categoria|que|de)|$)/i,
  );
  const brandHit = brandQuoted?.[1] ?? brandPlain?.[1];
  if (brandHit) {
    intent.brandName = brandHit.trim();
    text = text
      .replace(brandQuoted?.[0] ?? brandPlain?.[0] ?? '', ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const catQuoted = text.match(
    /(?:da\s+categoria|categoria|do\s+tipo)\s+["“']([^"”']+)["”']/i,
  );
  const catPlain = text.match(
    /(?:da\s+categoria|categoria|do\s+tipo)\s+([a-z0-9][\wÀ-ÿ\- ]{1,40}?)(?=\s+(?:abaixo|acima|ate|até|com|em|sem|marca|que|de)|$)/i,
  );
  const catHit = catQuoted?.[1] ?? catPlain?.[1];
  if (catHit) {
    intent.categoryName = catHit.trim();
    text = text
      .replace(catQuoted?.[0] ?? catPlain?.[0] ?? '', ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const between = text.match(
    /entre\s+(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s+e\s+(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i,
  );
  if (between?.[1] && between[2]) {
    const a = parseMoneyToken(between[1]);
    const b = parseMoneyToken(between[2]);
    if (a != null && b != null) {
      intent.priceMin = Math.min(a, b);
      intent.priceMax = Math.max(a, b);
    }
    text = text.replace(between[0], ' ').trim();
  }

  const max = text.match(
    /(?:abaixo\s+de|menor\s+que|ate|até|por\s+menos\s+de|<)\s*(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i,
  );
  if (max?.[1]) {
    intent.priceMax = parseMoneyToken(max[1]);
    text = text.replace(max[0], ' ').trim();
  }

  const min = text.match(
    /(?:acima\s+de|maior\s+que|a\s+partir\s+de|>)\s*(?:r\$\s*)?(\d+(?:[.,]\d+)?)/i,
  );
  if (min?.[1]) {
    intent.priceMin = parseMoneyToken(min[1]);
    text = text.replace(min[0], ' ').trim();
  }

  if (
    /\b(em estoque|com estoque|disponiveis|disponíveis|que tem estoque)\b/.test(
      text,
    )
  ) {
    intent.inStock = true;
    text = text
      .replace(
        /\b(em estoque|com estoque|disponiveis|disponíveis|que tem estoque)\b/g,
        ' ',
      )
      .trim();
  }

  const leftover = remainderToSearch(text);
  if (intent.similarTo) {
    intent.search = intent.similarTo;
  } else {
    intent.search = leftover;
  }

  return intent;
}

export function extractQuotedLabel(text: string): string | null {
  return extractQuoted(text).value;
}
