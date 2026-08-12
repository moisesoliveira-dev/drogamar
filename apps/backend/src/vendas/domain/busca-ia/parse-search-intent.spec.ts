import { parseSearchIntent } from './parse-search-intent';

describe('parseSearchIntent', () => {
  it('extrai preço máximo', () => {
    const intent = parseSearchIntent('Mostre produtos abaixo de R$ 50');
    expect(intent.priceMax).toBe(50);
    expect(intent.search).toBeNull();
  });

  it('extrai marca', () => {
    const intent = parseSearchIntent('Tem algum produto da marca Genérico?');
    expect(intent.brandName?.toLowerCase()).toContain('generico');
  });

  it('extrai categoria e preço', () => {
    const intent = parseSearchIntent(
      'Produtos da categoria bebidas abaixo de 20 reais',
    );
    expect(intent.categoryName?.toLowerCase()).toContain('bebidas');
    expect(intent.priceMax).toBe(20);
  });

  it('marca em estoque', () => {
    const intent = parseSearchIntent('Quais produtos estão em estoque?');
    expect(intent.inStock).toBe(true);
  });

  it('mantém termos livres (sem açúcar)', () => {
    const intent = parseSearchIntent('Quero uma bebida sem açúcar');
    expect(intent.search).toContain('bebida');
    expect(intent.search).toContain('acucar');
  });

  it('interpreta similaridade como busca textual', () => {
    const intent = parseSearchIntent('Procure algo parecido com dipirona');
    expect(intent.similarTo).toContain('dipirona');
    expect(intent.search).toContain('dipirona');
  });

  it('intervalo de preço', () => {
    const intent = parseSearchIntent('produtos entre 10 e 30 reais');
    expect(intent.priceMin).toBe(10);
    expect(intent.priceMax).toBe(30);
  });
});
