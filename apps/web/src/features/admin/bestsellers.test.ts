/**
 * Testy parsování seznamu bestsellerů od správce.
 */
import { describe, expect, it } from 'vitest';
import { formatBestsellers, parseBestsellers } from './bestsellers';

describe('parseBestsellers', () => {
  it('čte název, SKU a URL v libovolném pořadí sloupců 2–3', () => {
    const { items, errors } = parseBestsellers('DS4 | DS4-01 | https://a.test/ds4\nQS40 | https://a.test/qs40\nJen název');
    expect(errors).toEqual([]);
    expect(items).toEqual([
      { name: 'DS4', sku: 'DS4-01', url: 'https://a.test/ds4' },
      { name: 'QS40', url: 'https://a.test/qs40' },
      { name: 'Jen název' },
    ]);
  });

  it('hlásí více než 10 položek a chybějící název', () => {
    const many = Array.from({ length: 11 }, (_, i) => `P${i}`).join('\n');
    expect(parseBestsellers(many).errors[0]).toContain('nejvýše 10');
    expect(parseBestsellers(' | SKU1').errors[0]).toContain('chybí název');
  });

  it('formátování je inverzní k parsování', () => {
    const text = formatBestsellers([{ inputName: 'DS4', inputSku: 'S1', inputUrl: null }]);
    expect(text).toBe('DS4 | S1');
    expect(parseBestsellers(text).items).toEqual([{ name: 'DS4', sku: 'S1' }]);
  });
});
