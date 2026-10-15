/**
 * Generátor testovacích dokumentů (PDF, DOCX, XLSX) fiktivního dodavatele.
 * Dokumenty vznikají za běhu testu – v repozitáři nejsou žádné skutečné katalogy.
 */
import { Document, Packer, Paragraph } from 'docx';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

/** Dvoustránkové PDF s textovou vrstvou. */
export function makePdf(pages: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    for (const text of pages) {
      doc.addPage();
      doc.fontSize(12).text(text);
    }
    doc.end();
  });
}

/** DOCX s odstavci. */
export function makeDocx(paragraphs: string[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children: paragraphs.map((p) => new Paragraph(p)) }] });
  return Packer.toBuffer(doc);
}

/** XLSX s produktovou tabulkou (včetně cenového sloupce, který se nesmí importovat). */
export async function makeXlsx(rows: (string | number)[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Products');
  rows.forEach((r) => sheet.addRow(r));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
