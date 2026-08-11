import { sanitizeExportFileName } from './file-name';

describe('sanitizeExportFileName', () => {
  it('remove path traversal e caracteres inválidos', () => {
    expect(sanitizeExportFileName('../../etc/passwd', 'fallback', 'csv')).toBe(
      'etc_passwd.csv',
    );
  });

  it('usa fallback quando vazio', () => {
    expect(sanitizeExportFileName('   ', 'estoque_itens_2026-08-11', 'xlsx')).toBe(
      'estoque_itens_2026-08-11.xlsx',
    );
  });

  it('preserva extensão correta', () => {
    expect(sanitizeExportFileName('relatorio.pdf', 'base', 'xlsx')).toBe(
      'relatorio.xlsx',
    );
  });
});
