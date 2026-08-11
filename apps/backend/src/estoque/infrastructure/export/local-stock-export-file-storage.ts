import { Inject } from '@nestjs/common';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import {
  mimeForFormat,
} from '../../domain/export/file-name';
import type { StockExportFormat } from '../../domain/export/export-types';
import type {
  GeneratedFile,
  StockExportConfig,
  StockExportFileStorage,
} from '../../domain/ports/stock-export.ports';
import { STOCK_EXPORT_CONFIG } from '../../domain/ports/stock-export.ports';

@Injectable()
export class LocalStockExportFileStorage implements StockExportFileStorage {
  constructor(
    @Inject(STOCK_EXPORT_CONFIG)
    private readonly config: StockExportConfig,
  ) {}

  private root(): string {
    return path.isAbsolute(this.config.storagePath)
      ? this.config.storagePath
      : path.resolve(process.cwd(), this.config.storagePath);
  }

  async ensureReady(): Promise<void> {
    await mkdir(this.root(), { recursive: true });
  }

  resolveAbsolutePath(relativePath: string): string {
    const absolute = path.resolve(this.root(), relativePath);
    if (!absolute.startsWith(this.root())) {
      throw new Error('Invalid export path');
    }
    return absolute;
  }

  async deleteIfExists(relativePath: string | null): Promise<void> {
    if (!relativePath) return;
    try {
      await unlink(this.resolveAbsolutePath(relativePath));
    } catch {
      // ignore missing files
    }
  }

  async writeGenerated(
    jobId: string,
    fileName: string,
    format: StockExportFormat,
    headers: string[],
    rows: Array<Array<string | number | boolean | null>>,
    title: string,
  ): Promise<GeneratedFile> {
    await this.ensureReady();
    const relativePath = path.join(jobId, fileName);
    const absolutePath = this.resolveAbsolutePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });

    if (format === 'XLSX') {
      await this.writeXlsx(absolutePath, headers, rows, title);
    } else if (format === 'CSV') {
      await this.writeCsv(absolutePath, headers, rows);
    } else {
      await this.writePdf(absolutePath, headers, rows, title);
    }

    const info = await stat(absolutePath);
    return {
      absolutePath,
      relativePath: relativePath.replace(/\\/g, '/'),
      mimeType: mimeForFormat(format),
      sizeBytes: info.size,
    };
  }

  private async writeXlsx(
    absolutePath: string,
    headers: string[],
    rows: Array<Array<string | number | boolean | null>>,
    title: string,
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Drogamar';
    const sheet = workbook.addWorksheet(title.slice(0, 31) || 'Exportação');
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) {
      sheet.addRow(row.map((cell) => (cell == null ? '' : cell)));
    }
    sheet.columns.forEach((col) => {
      let max = 12;
      col.eachCell?.({ includeEmpty: true }, (cell) => {
        const len = String(cell.value ?? '').length;
        if (len > max) max = Math.min(len, 48);
      });
      col.width = max + 2;
    });
    await workbook.xlsx.writeFile(absolutePath);
  }

  private async writeCsv(
    absolutePath: string,
    headers: string[],
    rows: Array<Array<string | number | boolean | null>>,
  ): Promise<void> {
    const escape = (value: string | number | boolean | null) => {
      if (value == null) return '';
      const text = String(value);
      if (/[",;\n\r]/.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    };
    const lines = [
      headers.map(escape).join(';'),
      ...rows.map((row) => row.map(escape).join(';')),
    ];
    await writeFile(absolutePath, `\uFEFF${lines.join('\n')}`, 'utf8');
  }

  private writePdf(
    absolutePath: string,
    headers: string[],
    rows: Array<Array<string | number | boolean | null>>,
    title: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        margin: 36,
        size: 'A4',
        layout: rows[0] && rows[0].length > 6 ? 'landscape' : 'portrait',
      });
      const stream = createWriteStream(absolutePath);
      doc.pipe(stream);
      doc.fontSize(14).text(title, { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor('#444').text(`Gerado em ${new Date().toLocaleString('pt-BR')}`);
      doc.moveDown();
      doc.fillColor('#000');

      const colCount = Math.max(headers.length, 1);
      const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const colWidth = pageWidth / colCount;

      const drawRow = (
        values: Array<string | number | boolean | null>,
        bold = false,
      ) => {
        const y = doc.y;
        values.forEach((value, index) => {
          doc
            .font(bold ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(8)
            .text(value == null ? '' : String(value), doc.page.margins.left + index * colWidth, y, {
              width: colWidth - 4,
              ellipsis: true,
            });
        });
        doc.moveDown(0.8);
        if (doc.y > doc.page.height - 48) {
          doc.addPage();
        }
      };

      drawRow(headers, true);
      for (const row of rows) {
        drawRow(row);
      }

      doc.end();
      stream.on('finish', () => resolve());
      stream.on('error', reject);
      doc.on('error', reject);
    });
  }
}
