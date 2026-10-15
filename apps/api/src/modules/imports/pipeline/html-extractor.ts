/**
 * Extrakce obsahu z HTML stránky (bez spouštění JavaScriptu): titulek, meta popisy,
 * strukturovaná data JSON-LD (Organization, Product), textové bloky, odkazy, produktové odkazy
 * a heuristika „stránka se vykresluje JavaScriptem“.
 */
import { load } from 'cheerio';
import type { CheerioAPI } from 'cheerio';
import { normalizeWhitespace } from '../../../common/text';

/** Odkaz nalezený na stránce. */
export interface PageLink {
  url: string;
  text: string;
  inNav: boolean;
}

/** Produkt nalezený ve strukturovaných datech nebo v odkazech výpisu. */
export interface PageProduct {
  name: string;
  url: string | null;
  sku: string | null;
  imageUrl: string | null;
  description: string | null;
  material: string | null;
  origin: 'json-ld' | 'link' | 'og';
}

/** Údaje o organizaci ze schema.org. */
export interface PageOrganization {
  name: string | null;
  description: string | null;
  foundingDate: string | null;
  founders: string[];
  addressLocality: string | null;
  addressCountry: string | null;
  streetAddress: string | null;
  email: string | null;
  telephone: string | null;
  logo: string | null;
}

/** Výsledek extrakce jedné HTML stránky. */
export interface ExtractedPage {
  url: string;
  title: string;
  lang: string | null;
  metaDescription: string | null;
  ogTitle: string | null;
  ogImage: string | null;
  ogType: string | null;
  textBlocks: string[];
  links: PageLink[];
  organization: PageOrganization | null;
  products: PageProduct[];
  /** Počet <script> tagů a délka viditelného textu – pro detekci JS aplikací. */
  scriptCount: number;
  visibleTextLength: number;
  likelyJsRendered: boolean;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as JsonRecord) : null;
}

/** Bezpečně převede JSON-LD hodnotu (řetězec, objekt s `name`/`@id`/`url`, pole) na text. */
function asText(value: unknown): string | null {
  if (typeof value === 'string') return normalizeWhitespace(value) || null;
  if (typeof value === 'number') return String(value);
  if (Array.isArray(value)) return asText(value[0]);
  const rec = asRecord(value);
  if (rec) return asText(rec.name ?? rec.url ?? rec['@id'] ?? rec.contentUrl);
  return null;
}

/** Vrátí @type jako pole řetězců. */
function typesOf(node: JsonRecord): string[] {
  const t = node['@type'];
  if (typeof t === 'string') return [t];
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === 'string');
  return [];
}

/** Absolutizuje URL vůči základu; neplatné a ne-http(s) odkazy zahodí. */
export function absoluteUrl(href: string | undefined | null, base: string): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith('#') || /^(mailto|tel|javascript|data):/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

/** Rozbalí všechny JSON-LD uzly (včetně @graph a polí). */
function collectJsonLdNodes($: CheerioAPI): JsonRecord[] {
  const nodes: JsonRecord[] = [];
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const rec = asRecord(value);
    if (!rec) return;
    nodes.push(rec);
    if (Array.isArray(rec['@graph'])) visit(rec['@graph']);
    if (Array.isArray(rec.itemListElement)) visit(rec.itemListElement);
    if (rec.item) visit(rec.item);
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {
      // Nevalidní JSON-LD na webu dodavatele není důvod přerušit import.
    }
  });
  return nodes;
}

const ORG_TYPES = ['Organization', 'Corporation', 'LocalBusiness', 'Store', 'OnlineStore', 'Manufacturer', 'WholesaleStore'];

/** Vytěží údaje o organizaci z JSON-LD. */
function extractOrganization(nodes: JsonRecord[]): PageOrganization | null {
  const org = nodes.find((n) => typesOf(n).some((t) => ORG_TYPES.includes(t)));
  if (!org) return null;
  const address = asRecord(Array.isArray(org.address) ? org.address[0] : org.address);
  const founders = Array.isArray(org.founder) ? org.founder : org.founder ? [org.founder] : [];
  return {
    name: asText(org.name),
    description: asText(org.description),
    foundingDate: asText(org.foundingDate),
    founders: founders.map(asText).filter((f): f is string => Boolean(f)),
    addressLocality: address ? asText(address.addressLocality) : null,
    addressCountry: address ? asText(address.addressCountry) : null,
    streetAddress: address ? asText(address.streetAddress) : null,
    email: asText(org.email),
    telephone: asText(org.telephone),
    logo: asText(org.logo),
  };
}

/** Vytěží produkty z JSON-LD (`Product`). */
function extractJsonLdProducts(nodes: JsonRecord[], base: string): PageProduct[] {
  const productNodes = nodes.filter((n) => typesOf(n).includes('Product'));
  return productNodes
    .map((n) => ({
      name: asText(n.name) ?? '',
      // Jediný produkt bez vlastní URL je produkt této stránky (detail produktu).
      url: absoluteUrl(asText(n.url), base) ?? (productNodes.length === 1 ? base : null),
      sku: asText(n.sku) ?? asText(n.mpn) ?? asText(n.productID),
      imageUrl: absoluteUrl(asText(n.image), base),
      description: asText(n.description),
      material: asText(n.material),
      origin: 'json-ld' as const,
    }))
    .filter((p) => p.name.length > 1);
}

/** Vzory URL typické pro detail produktu napříč e-shopovými platformami. */
const PRODUCT_PATH = /\/(products?|produkt[ey]?|artikel|article|item|p|shop\/[^/]+)\/[^/?#]{3,}/i;

/** Najde odkazy na produkty ve výpisu, včetně obrázku uvnitř odkazu. */
function extractLinkProducts($: CheerioAPI, base: string): PageProduct[] {
  const found = new Map<string, PageProduct>();
  $('a[href]').each((_, el) => {
    const url = absoluteUrl($(el).attr('href'), base);
    if (!url || !PRODUCT_PATH.test(new URL(url).pathname)) return;
    const img = $(el).find('img').first();
    const name = cleanLinkText($(el).attr('title') ?? $(el).text()) || normalizeWhitespace(img.attr('alt') ?? '');
    if (name.length < 3 || name.length > 140) return;
    const src = img.attr('data-src') ?? img.attr('src') ?? img.attr('srcset')?.split(/\s+/)[0];
    const existing = found.get(url);
    if (!existing) {
      found.set(url, { name, url, sku: null, imageUrl: absoluteUrl(src, base), description: null, material: null, origin: 'link' });
    } else if (!existing.imageUrl && src) {
      existing.imageUrl = absoluteUrl(src, base);
    }
  });
  return [...found.values()];
}

/** Vyčistí text odkazu (odstraní oddělovače typu „|||“ z markupu menu). */
export function cleanLinkText(text: string): string {
  return normalizeWhitespace(text.replace(/\|{2,}/g, ' '));
}

/**
 * Obecná detekce produktových výpisů podle „sourozeneckých“ URL: pokud na stránce existuje
 * alespoň `MIN_SIBLINGS` odkazů se stejnou šablonou cesty lišících se v jednom segmentu
 * (např. `/en/pens/*\/overview`), jde téměř jistě o výpis produktů/modelů. Funguje bez
 * znalosti konkrétního webu – nevyžaduje `/product/` v URL.
 */
const MIN_SIBLINGS = 6;
export function extractTemplateProducts(links: PageLink[], pageUrl: string): PageProduct[] {
  let host = '';
  try {
    host = new URL(pageUrl).hostname.replace(/^www\./, '');
  } catch {
    return [];
  }
  const groups = new Map<string, Map<string, string>>();
  for (const link of links) {
    let url: URL;
    try {
      url = new URL(link.url);
    } catch {
      continue;
    }
    if (url.hostname.replace(/^www\./, '') !== host || url.search) continue;
    const segments = url.pathname.split('/').filter(Boolean);
    // Proměnný segment musí být aspoň na 2. úrovni (ne horní menu typu /about, /contact);
    // jazykový prefix (/en/, /de-at/) se za úroveň nepočítá.
    const minIndex = segments[0] && /^[a-z]{2}(-[a-z]{2})?$/i.test(segments[0]) ? 2 : 1;
    for (let i = minIndex; i < segments.length; i++) {
      if (/^[a-z]{2}(-[a-z]{2})?$/i.test(segments[i])) continue;
      const template = segments.map((s, j) => (j === i ? '*' : s)).join('/');
      const group = groups.get(template) ?? new Map<string, string>();
      if (!group.has(link.url)) group.set(link.url, cleanLinkText(link.text));
      groups.set(template, group);
    }
  }
  const products: PageProduct[] = [];
  const seen = new Set<string>();
  for (const group of groups.values()) {
    if (group.size < MIN_SIBLINGS || group.size > 200) continue;
    for (const [url, text] of group) {
      if (seen.has(url) || text.length < 2 || text.length > 120) continue;
      seen.add(url);
      products.push({ name: text, url, sku: null, imageUrl: null, description: null, material: null, origin: 'link' });
    }
  }
  return products;
}

/**
 * Hlavní funkce: rozparsuje HTML a vrátí strukturovaný výsledek.
 * @param html surové HTML
 * @param pageUrl finální URL stránky (pro absolutizaci odkazů)
 */
export function extractHtml(html: string, pageUrl: string): ExtractedPage {
  const $ = load(html);
  // Počítáme jen spustitelné skripty – JSON-LD a šablony nejsou známkou JS aplikace.
  const scriptCount = $('script').filter((_, el) => !/json|template/i.test($(el).attr('type') ?? '')).length;
  const jsonLdNodes = collectJsonLdNodes($);

  const meta = (selector: string): string | null => {
    const v = $(selector).attr('content');
    return v ? normalizeWhitespace(v) || null : null;
  };

  // Odkazy sbíráme před odstraněním navigace – menu je klíčové pro kategorie (kap. 3).
  const links: PageLink[] = [];
  const seen = new Set<string>();
  $('a[href]').each((_, el) => {
    const url = absoluteUrl($(el).attr('href'), pageUrl);
    const text = cleanLinkText($(el).text() || $(el).attr('title') || $(el).attr('aria-label') || '');
    if (!url || seen.has(url)) return;
    seen.add(url);
    links.push({ url, text: text.slice(0, 120), inNav: $(el).closest('nav, header, [role="navigation"], .menu, .navigation').length > 0 });
  });

  // Produkty: strukturovaná data > odkazy typu /product/ > obecné sourozenecké výpisy.
  const linkProducts = extractLinkProducts($, pageUrl);
  const products = [...extractJsonLdProducts(jsonLdNodes, pageUrl), ...linkProducts];
  for (const p of extractTemplateProducts(links, pageUrl)) {
    if (!products.some((x) => x.url === p.url)) products.push(p);
  }
  const ogType = meta('meta[property="og:type"]');
  // Detail produktu bez JSON-LD: použijeme Open Graph (název + originální obrázek stránky).
  if (ogType?.includes('product') && !products.some((p) => p.origin === 'json-ld')) {
    const name = meta('meta[property="og:title"]');
    if (name) {
      products.unshift({
        name,
        url: pageUrl,
        sku: null,
        imageUrl: absoluteUrl(meta('meta[property="og:image"]'), pageUrl),
        description: meta('meta[property="og:description"]'),
        material: null,
        origin: 'og',
      });
    }
  }

  // Odstraníme neobsahové části; navigaci vynecháme z textu, aby nevznikala falešná „fakta“ z menu.
  $('script, style, noscript, svg, iframe, template, nav, [role="navigation"], form, button').remove();

  const blocks: string[] = [];
  const blockSeen = new Set<string>();
  $('h1, h2, h3, h4, h5, p, li, dt, dd, td, th, blockquote, figcaption, address').each((_, el) => {
    // Vnořené prvky (např. p uvnitř li) by text duplikovaly – bereme jen „listy“.
    if ($(el).find('p, li, h1, h2, h3, h4, td').length > 0) return;
    const text = normalizeWhitespace($(el).text());
    if (text.length < 3 || blockSeen.has(text)) return;
    blockSeen.add(text);
    blocks.push(text);
  });

  // Záložní cesta pro weby bez sémantických značek (div-only layouty).
  const bodyText = normalizeWhitespace($('body').text());
  if (blocks.join(' ').length < bodyText.length * 0.3) {
    $('body').find('div, span, section').each((_, el) => {
      if ($(el).children().length > 0) return;
      const text = normalizeWhitespace($(el).text());
      if (text.length < 20 || blockSeen.has(text)) return;
      blockSeen.add(text);
      blocks.push(text);
    });
  }

  const visibleTextLength = blocks.join(' ').length;
  return {
    url: pageUrl,
    title: normalizeWhitespace($('title').first().text()) || meta('meta[property="og:title"]') || pageUrl,
    lang: $('html').attr('lang') ?? null,
    metaDescription: meta('meta[name="description"]'),
    ogTitle: meta('meta[property="og:title"]'),
    ogImage: absoluteUrl(meta('meta[property="og:image"]'), pageUrl),
    ogType,
    textBlocks: blocks,
    links,
    organization: extractOrganization(jsonLdNodes),
    products,
    scriptCount,
    visibleTextLength,
    // Málo textu + hodně skriptů = typická SPA/JS aplikace, kterou bez renderu nepřečteme.
    likelyJsRendered: visibleTextLength < 400 && scriptCount >= 3,
  };
}

/** Vytáhne URL ze sitemap XML (urlset i sitemapindex). */
export function extractSitemapUrls(xml: string): { pages: string[]; sitemaps: string[] } {
  const $ = load(xml, { xmlMode: true });
  const pages: string[] = [];
  const sitemaps: string[] = [];
  $('url > loc').each((_, el) => {
    pages.push($(el).text().trim());
  });
  $('sitemap > loc').each((_, el) => {
    sitemaps.push($(el).text().trim());
  });
  return { pages, sitemaps };
}
