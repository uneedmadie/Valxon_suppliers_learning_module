/**
 * Testy parseru značkování kapitol.
 */
import { describe, expect, it } from 'vitest';
import { parseMarkup } from './markup-parser';

describe('parseMarkup', () => {
  it('rozpozná nadpisy, odstavce, odrážky a citace', () => {
    expect(parseMarkup('## Nadpis\nPrvní řádek\npokračování\n\n- a\n- b\n> citace')).toEqual([
      { type: 'heading', text: 'Nadpis' },
      { type: 'paragraph', text: 'První řádek pokračování' },
      { type: 'list', items: ['a', 'b'] },
      { type: 'quote', text: 'citace' },
    ]);
  });

  it('HTML zůstává obyčejným textem (žádné XSS)', () => {
    expect(parseMarkup('<script>alert(1)</script>')).toEqual([{ type: 'paragraph', text: '<script>alert(1)</script>' }]);
  });

  it('prázdný vstup = žádné bloky', () => expect(parseMarkup('  \n ')).toEqual([]));
});
