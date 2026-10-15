/**
 * Testy párování bestsellerů: jednoznačná shoda vs. kandidáti k ručnímu potvrzení.
 */
import { matchBestseller, MatchableProduct } from './product-matching';

const products: MatchableProduct[] = [
  { name: 'Jute Shopper Natural', url: 'https://acme.test/products/jute-shopper', sku: 'AB-100', imageUrl: 'https://acme.test/1.jpg', location: 'x' },
  { name: 'Cotton Tote Bag', url: 'https://acme.test/products/cotton-tote', sku: 'AB-200', imageUrl: null, location: 'x' },
  { name: 'Cotton Tote Bag Large', url: 'https://acme.test/products/cotton-tote-l', sku: 'AB-201', imageUrl: null, location: 'x' },
];

describe('matchBestseller', () => {
  it('URL → matched', () => {
    expect(matchBestseller({ name: 'cokoli', sku: null, url: 'https://www.acme.test/products/jute-shopper/' }, products).status).toBe('matched');
  });
  it('SKU (bez ohledu na formát) → matched', () => {
    const r = matchBestseller({ name: 'x', sku: 'ab 200', url: null }, products);
    expect(r.status).toBe('matched');
    expect(r.match?.name).toBe('Cotton Tote Bag');
  });
  it('identický název → matched', () => {
    expect(matchBestseller({ name: 'cotton tote bag', sku: null, url: null }, products).status).toBe('matched');
  });
  it('podobný název → jen kandidáti (ambiguous), nikdy automatická shoda', () => {
    const r = matchBestseller({ name: 'Tote Bag Cotton Premium', sku: null, url: null }, products);
    expect(r.status).toBe('ambiguous');
    expect(r.match).toBeNull();
    expect(r.candidates.length).toBeGreaterThan(0);
  });
  it('nic podobného → not_found', () => {
    expect(matchBestseller({ name: 'Steel Bottle', sku: 'ZZ-1', url: null }, products).status).toBe('not_found');
  });
});
