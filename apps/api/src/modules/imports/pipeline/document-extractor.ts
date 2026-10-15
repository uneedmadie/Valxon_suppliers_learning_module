/**
 * Extrakce textu z dokumentů PDF, DOCX a XLSX do citovatelných segmentů s přesnou lokací
 * (strana PDF, odstavec DOCX, list a řádek XLSX). Cenové sloupce tabulek se záměrně
 * neimportují do výukového obsahu – interní ceny nesmí uniknout ke studentům.
 */
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { normalizeWhitespace } from '../../../common/text';

/** Podporované typy dokumentů. */
export type DocumentKind = 'pdf' | 'docx' | 'xlsx';

/** Citovatelný segment dokumentu. */
export interface DocumentSegment {
  location: string;
  text: string;
}

/** Produkt rozpoznaný v tabulce. */
export interface TableProduct {
  name: string;
  sku: string | null;
  category: string | null;
  material: string | null;
  description: string | null;
  location: string;
}

/** Výsledek extrakce dokumentu. */
export interface ExtractedDocument {
  segments: DocumentSegment[];
  warnings: string[];
  products: TableProduct[];
  pageCount: number | null;
}

/** Maximální délka jednoho segmentu – delší text dělíme kvůli přesnějším citacím. */
const SEGMENT_MAX = 1800;
const XLSX_MAX_ROWS = 5000;

/**
 * Ověří, že obsah souboru odpovídá deklarovanému typu (magic bytes),
 * aby se do parserů nedostal soubor s podvrženou příponou.
 */
export function detectDocumentKind(buffer: Buffer, fileName: string): DocumentKind | null {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  const isPdf = buffer.subarray(0, 5).toString('latin1') === '%PDF-';
  const isZip = buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  if (ext === 'pdf' && isPdf) return 'pdf';
  if (ext === 'docx' && isZip) return 'docx';
  if (ext === 'xlsx' && isZip) return 'xlsx';
  return null;
}

/** Rozdělí dlouhý text na části podle odstavců, aby citace zůstaly krátké. */
function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\s*\n|\n(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ•\-–])/u).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const p of paragraphs) {
    if ((current + '\n' + p).length > SEGMENT_MAX && current) {
      chunks.push(current);
      current = p;
    } else {
      current = current ? `${current}\n${p}` : p;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

/** Extrakce PDF po stranách – lokace segmentu je „str. N“. */
async function extractPdf(buffer: Buffer): Promise<ExtractedDocument> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    const segments: DocumentSegment[] = [];
    for (const page of result.pages) {
      for (const chunk of chunkText(page.text)) segments.push({ location: `str. ${page.num}`, text: chunk });
    }
    const warnings: string[] = [];
    // PDF bez textové vrstvy (sken) – OCR není v této verzi zprovozněné, pravdivě to hlásíme.
    const textLength = segments.reduce((sum, s) => sum + s.text.length, 0);
    if (result.pages.length > 0 && textLength < 40 * result.pages.length) {
      warnings.push('PDF obsahuje málo nebo žádný text – pravděpodobně sken. OCR není zprovozněné; nahrajte textovou verzi nebo doplňte fakta ručně.');
    }
    return { segments, warnings, products: [], pageCount: result.pages.length };
  } finally {
    await parser.destroy();
  }
}

/** Extrakce DOCX – lokace segmentu je pořadí odstavce. */
async function extractDocx(buffer: Buffer): Promise<ExtractedDocument> {
  const { value, messages } = await mammoth.extractRawText({ buffer });
  const paragraphs = value.split(/\n+/).map((p) => normalizeWhitespace(p)).filter((p) => p.length > 0);
  const segments = paragraphs.map((text, i) => ({ location: `odst. ${i + 1}`, text }));
  const warnings = messages.filter((m) => m.type === 'warning').slice(0, 3).map((m) => `DOCX: ${m.message}`);
  return { segments, warnings, products: [], pageCount: null };
}

/** Rozpoznávání významu sloupců podle záhlaví (vícejazyčně). */
const COLUMN_PATTERNS = {
  name: /^(name|product|product name|item|item name|title|název|nazev|produkt|artikel|artikelname|omschrijving|description short)$/i,
  sku: /^(sku|code|item ?no\.?|item number|article ?no\.?|art\.? ?nr\.?|kód|kod|katalogové číslo|ref|reference|model)$/i,
  category: /^(category|categories|kategorie|segment|group|skupina|categorie|kategorie produktu)$/i,
  material: /^(material|materiál|materiaal|composition|složení)$/i,
  description: /^(description|popis|beschreibung|omschrijving|details)$/i,
  price: /(price|cena|preis|prijs|cost|nákup|purchase|eur|czk|usd|€)/i,
};

/** Převede hodnotu buňky ExcelJS na prostý text. */
function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((r) => r.text).join('');
    if ('text' in value && typeof value.text === 'string') return value.text;
    if ('result' in value && value.result !== undefined) return cellText(value.result);
  }
  return '';
}

/**
 * Extrakce XLSX: každý řádek je segment „list X, ř. N“. Pokud záhlaví odpovídá produktové
 * tabulce, vzniknou i kandidáti produktů. Sloupce s cenami se přeskakují a hlásí ve varování.
 */
async function extractXlsx(buffer: Buffer): Promise<ExtractedDocument> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const segments: DocumentSegment[] = [];
  const products: TableProduct[] = [];
  const warnings: string[] = [];
  let rowsRead = 0;

  for (const sheet of workbook.worksheets) {
    // Záhlaví = první řádek s alespoň dvěma textovými buňkami.
    let headerRow = 0;
    let headers: string[] = [];
    for (let r = 1; r <= Math.min(sheet.rowCount, 15); r++) {
      const values = (sheet.getRow(r).values as ExcelJS.CellValue[]).slice(1).map(cellText).map((s) => s.trim());
      if (values.filter((v) => v && Number.isNaN(Number(v))).length >= 2) {
        headerRow = r;
        headers = values;
        break;
      }
    }
    if (!headerRow) continue;

    const columnIndex = (pattern: RegExp): number => headers.findIndex((h) => pattern.test(h));
    const priceColumns = headers.map((h, i) => (COLUMN_PATTERNS.price.test(h) ? i : -1)).filter((i) => i >= 0);
    if (priceColumns.length > 0) {
      warnings.push(`List „${sheet.name}“: cenové sloupce (${priceColumns.map((i) => headers[i]).join(', ')}) nebyly importovány – interní ceny nepatří do výukového obsahu.`);
    }
    const col = {
      name: columnIndex(COLUMN_PATTERNS.name),
      sku: columnIndex(COLUMN_PATTERNS.sku),
      category: columnIndex(COLUMN_PATTERNS.category),
      material: columnIndex(COLUMN_PATTERNS.material),
      description: columnIndex(COLUMN_PATTERNS.description),
    };

    for (let r = headerRow + 1; r <= sheet.rowCount && rowsRead < XLSX_MAX_ROWS; r++) {
      const values = (sheet.getRow(r).values as ExcelJS.CellValue[]).slice(1).map(cellText).map((s) => normalizeWhitespace(s));
      if (values.every((v) => !v)) continue;
      rowsRead++;
      const location = `list „${sheet.name}“, ř. ${r}`;
      // Segment obsahuje dvojice „záhlaví: hodnota“ bez cenových sloupců.
      const text = values
        .map((v, i) => (v && !priceColumns.includes(i) ? `${headers[i] || `sloupec ${i + 1}`}: ${v}` : ''))
        .filter(Boolean)
        .join('; ');
      if (text) segments.push({ location, text });

      const pick = (i: number): string | null => (i >= 0 && values[i] ? values[i] : null);
      const name = pick(col.name);
      if (name) {
        products.push({ name, sku: pick(col.sku), category: pick(col.category), material: pick(col.material), description: pick(col.description), location });
      }
    }
  }
  if (rowsRead >= XLSX_MAX_ROWS) warnings.push(`Načteno prvních ${XLSX_MAX_ROWS} řádků; zbytek tabulky byl vynechán.`);
  return { segments, warnings, products, pageCount: null };
}

/**
 * Extrahuje dokument podle typu.
 * @throws Error s českou zprávou při poškozeném souboru (zachytí ji import a zapíše do reportu).
 */
export async function extractDocument(kind: DocumentKind, buffer: Buffer): Promise<ExtractedDocument> {
  try {
    if (kind === 'pdf') return await extractPdf(buffer);
    if (kind === 'docx') return await extractDocx(buffer);
    return await extractXlsx(buffer);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Soubor ${kind.toUpperCase()} se nepodařilo přečíst: ${reason}`);
  }
}
