export function sanitizeExportFileName(
  raw: string | undefined,
  fallbackBase: string,
  extension: string,
): string {
  const ext = extension.startsWith('.') ? extension.slice(1) : extension;
  const base = (raw?.trim() || fallbackBase)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 120);

  const safeBase = base.length > 0 ? base : fallbackBase;
  const withoutExt = safeBase.replace(/\.[a-zA-Z0-9]+$/, '');
  return `${withoutExt}.${ext}`;
}

export function defaultExportBaseName(
  typeLabel: string,
  now = new Date(),
): string {
  const date = now.toISOString().slice(0, 10);
  const slug = typeLabel
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  return `estoque_${slug}_${date}`;
}

export function extensionForFormat(format: 'XLSX' | 'CSV' | 'PDF'): string {
  if (format === 'XLSX') return 'xlsx';
  if (format === 'CSV') return 'csv';
  return 'pdf';
}

export function mimeForFormat(format: 'XLSX' | 'CSV' | 'PDF'): string {
  if (format === 'XLSX') {
    return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
  if (format === 'CSV') return 'text/csv; charset=utf-8';
  return 'application/pdf';
}
