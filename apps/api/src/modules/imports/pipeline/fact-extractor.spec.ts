/**
 * Testy deterministické extrakce faktů a detekce rozporů.
 */
import { detectConflicts, extractFacts, StructuredHints } from './fact-extractor';

const seg = (text: string, location = 'https://acme.test/faq') => ({ sourceId: 's1', location, text, origin: 'official' as const });

describe('extractFacts', () => {
  const facts = extractFacts([], [
    seg('The minimum order quantity is 250 pieces per design. Delivery time is 10-12 working days after artwork approval.'),
    seg('Acme Bags was founded in 2004 in Utrecht. Our mission is to make promotional bags circular.'),
    seg('We offer screen printing, embroidery and laser engraving. Samples are available on request.'),
    seg('Acme B.V., Main Street 12, 3511 AB Utrecht, The Netherlands'),
    seg('Contact us at sales@acme.test for a quotation.'),
    seg('© 2024 Acme. All rights reserved.'),
  ]);
  const of = (kind: string) => facts.filter((f) => f.kind === kind);

  it('vytáhne MOQ a lhůtu s normalizovanou hodnotou a citací', () => {
    expect(of('moq')[0]).toMatchObject({ chapter: 6, value: '250 pieces' });
    expect(of('moq')[0].quote).toContain('minimum order quantity');
    expect(of('lead_time')[0].value).toBe('10-12 working days');
  });

  it('vytáhne rok založení, misi, technologie, vzorky, sídlo a kontakt', () => {
    expect(of('founded')[0].value).toBe('2004');
    expect(of('mission').length).toBe(1);
    expect(of('technique').map((f) => f.value).sort()).toEqual(['Laserové gravírování', 'Sítotisk', 'Výšivka']);
    expect(of('samples').length).toBe(1);
    expect(of('headquarters')[0].value).toBe('Nizozemsko');
    expect(of('contact')[0].value).toBe('sales@acme.test');
  });

  it('čte i krátké řádky „MOQ: 300 pieces“', () => {
    expect(extractFacts([], [seg('MOQ: 300 pieces')]).find((f) => f.kind === 'moq')?.value).toBe('300 pieces');
  });

  it('lhůtu pro nahlášení vady nepovažuje za lhůtu dodání', () => {
    const complaint = extractFacts([], [seg('If goods are defective, the Buyer must notify the Supplier within 3 working days.')]);
    expect(complaint.some((f) => f.kind === 'lead_time')).toBe(false);
    expect(complaint.some((f) => f.kind === 'complaints')).toBe(true);
  });

  it('všechna fakta mají zdroj a lokaci; copyright není milník', () => {
    expect(facts.every((f) => f.sourceId === 's1' && f.location.length > 0)).toBe(true);
    expect(of('milestone').some((f) => f.value.includes('2024'))).toBe(false);
  });

  it('kategorie bere z navigace bez jazyků, účtů a produktů', () => {
    const hints: StructuredHints = {
      sourceId: 'h', location: 'https://acme.test/', origin: 'official', isHomepage: true, metaDescription: null, ogImage: null, organization: null, siteHost: 'acme.test',
      productUrls: ['https://acme.test/bags/jute'],
      navLinks: [
        { url: 'https://acme.test/bags', text: 'Bags', inNav: true },
        { url: 'https://acme.test/fr', text: 'Français', inNav: true },
        { url: 'https://acme.test/login', text: 'Login / Register', inNav: true },
        { url: 'https://acme.test/bags/jute', text: 'Jute Shopper', inNav: true },
        { url: 'https://other.test/x', text: 'Partner', inNav: true },
      ],
    };
    expect(extractFacts([hints], []).filter((f) => f.kind === 'category').map((f) => f.value)).toEqual(['Bags']);
  });
});

describe('detectConflicts', () => {
  it('nahlásí rozdílné roky založení, shodné ne', () => {
    const base = { kind: 'founded' as const, label: 'Rok založení', confidence: 'medium' as const };
    expect(detectConflicts([{ ...base, value: '1978', sourceId: 'a' }, { ...base, value: '2018', sourceId: 'b' }])).toHaveLength(1);
    expect(detectConflicts([{ ...base, value: '2004', sourceId: 'a' }, { ...base, value: '2004', sourceId: 'b' }])).toHaveLength(0);
  });
});
