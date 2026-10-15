/**
 * Čistá logika párování bestselleru zadaného správcem s produkty nalezenými v podkladech.
 * Pořadí jistoty: přesná URL → SKU → přesný název. Podobný název je jen kandidát
 * (`ambiguous`) a vždy ho potvrzuje správce – fotografie podobného výrobku se nesmí
 * vydávat za originál.
 */
import { normalizeForMatch } from '../../common/text';
import type { ProductCandidate } from './entities/product.entity';

/** Vstup správce. */
export interface BestsellerQuery {
  name: string;
  sku: string | null;
  url: string | null;
}

/** Produkt dostupný k párování. */
export interface MatchableProduct {
  name: string;
  url: string | null;
  sku: string | null;
  imageUrl: string | null;
  location: string;
}

/** Výsledek párování. */
export interface MatchResult {
  status: 'matched' | 'ambiguous' | 'not_found';
  match: MatchableProduct | null;
  candidates: ProductCandidate[];
}

const normalizeSku = (sku: string): string => sku.toLowerCase().replace(/[\s\-_.]/g, '');

const normalizeUrl = (url: string): string => {
  try {
    const u = new URL(url);
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/+$/, '')}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
};

/** Podobnost názvů: Diceův koeficient nad množinami slov. */
export function nameSimilarity(a: string, b: string): number {
  const ta = new Set(normalizeForMatch(a).split(' ').filter((t) => t.length > 1));
  const tb = new Set(normalizeForMatch(b).split(' ').filter((t) => t.length > 1));
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return (2 * common) / (ta.size + tb.size);
}

const toCandidate = (p: MatchableProduct, score: number): ProductCandidate => ({
  name: p.name,
  url: p.url,
  sku: p.sku,
  imageUrl: p.imageUrl,
  score: Math.round(score * 100) / 100,
  location: p.location,
});

/**
 * Spáruje jeden bestseller se seznamem produktů.
 * @returns `matched` jen při jednoznačné shodě (URL, SKU, identický název)
 */
export function matchBestseller(query: BestsellerQuery, products: MatchableProduct[]): MatchResult {
  // 1) Přesná URL produktu.
  if (query.url) {
    const target = normalizeUrl(query.url);
    const byUrl = products.find((p) => p.url && normalizeUrl(p.url) === target);
    if (byUrl) return { status: 'matched', match: byUrl, candidates: [toCandidate(byUrl, 1)] };
  }

  // 2) SKU – v datech nebo jako samostatný segment v URL produktu.
  if (query.sku) {
    const sku = normalizeSku(query.sku);
    const escaped = query.sku.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const skuInUrl = new RegExp(`(^|[/_=-])${escaped}([/_.?-]|$)`, 'i');
    const bySku = products.filter((p) => (p.sku && normalizeSku(p.sku) === sku) || (p.url !== null && skuInUrl.test(p.url)));
    if (bySku.length === 1) return { status: 'matched', match: bySku[0], candidates: [toCandidate(bySku[0], 1)] };
    if (bySku.length > 1) return { status: 'ambiguous', match: null, candidates: bySku.slice(0, 5).map((p) => toCandidate(p, 0.9)) };
  }

  // 3) Název – identický je shoda, podobný jen kandidát k ručnímu potvrzení.
  const target = normalizeForMatch(query.name);
  const exact = products.filter((p) => normalizeForMatch(p.name) === target);
  if (exact.length === 1) return { status: 'matched', match: exact[0], candidates: [toCandidate(exact[0], 1)] };

  const scored = products
    .map((p) => ({ p, score: nameSimilarity(query.name, p.name) }))
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  if (scored.length > 0 || exact.length > 1) {
    const candidates = [...exact.map((p) => toCandidate(p, 1)), ...scored.map((x) => toCandidate(x.p, x.score))].slice(0, 5);
    return { status: 'ambiguous', match: null, candidates };
  }
  return { status: 'not_found', match: null, candidates: [] };
}
