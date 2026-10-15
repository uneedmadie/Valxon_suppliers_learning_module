/**
 * Testy extrakce dokumentů: stránky PDF, odstavce DOCX, řádky XLSX bez cen a validace typu.
 */
import { makeDocx, makePdf, makeXlsx } from '../../../../test/fixtures/documents';
import { detectDocumentKind, extractDocument } from './document-extractor';

describe('document extractor', () => {
  it('PDF: segmenty s číslem strany', async () => {
    const pdf = await makePdf(['Minimum order quantity: 100 pcs.', 'Delivery time: 15 working days.']);
    expect(detectDocumentKind(pdf, 'katalog.pdf')).toBe('pdf');
    const doc = await extractDocument('pdf', pdf);
    expect(doc.pageCount).toBe(2);
    expect(doc.segments.find((s) => s.location === 'str. 2')?.text).toContain('15 working days');
  });

  it('DOCX: odstavce s pořadím', async () => {
    const docx = await makeDocx(['Our vision is greener merchandise.', 'Samples cost 25 EUR.']);
    expect(detectDocumentKind(docx, 'podminky.docx')).toBe('docx');
    const doc = await extractDocument('docx', docx);
    expect(doc.segments).toEqual([
      { location: 'odst. 1', text: 'Our vision is greener merchandise.' },
      { location: 'odst. 2', text: 'Samples cost 25 EUR.' },
    ]);
  });

  it('XLSX: produkty a kategorie, cenové sloupce vynechány s varováním', async () => {
    const xlsx = await makeXlsx([
      ['Name', 'SKU', 'Category', 'Material', 'Purchase price EUR'],
      ['Jute Shopper', 'AB-100', 'Bags', 'Jute', 1.25],
      ['Cotton Tote', 'AB-200', 'Bags', 'Cotton', 0.95],
    ]);
    const doc = await extractDocument('xlsx', xlsx);
    expect(doc.products[0]).toMatchObject({ name: 'Jute Shopper', sku: 'AB-100', category: 'Bags', material: 'Jute' });
    expect(doc.segments.map((s) => s.text).join(' ')).not.toContain('1.25');
    expect(doc.warnings[0]).toContain('cenové sloupce');
  });

  it('odmítne soubor s podvrženou příponou', () => {
    expect(detectDocumentKind(Buffer.from('not a pdf'), 'fake.pdf')).toBeNull();
    expect(detectDocumentKind(Buffer.from('%PDF-1.4'), 'virus.exe')).toBeNull();
  });
});
