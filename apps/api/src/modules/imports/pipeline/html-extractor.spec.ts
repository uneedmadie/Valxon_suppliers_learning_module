/**
 * Testy extrakce HTML: meta data, JSON-LD organizace/produktů, textové bloky,
 * detekce produktových výpisů a JS aplikací.
 */
import { extractHtml, extractSitemapUrls } from './html-extractor';

const PAGE = `<!doctype html><html lang="en"><head>
<title>Acme Bags</title>
<meta name="description" content="Acme Bags is a supplier of sustainable promotional bags.">
<meta property="og:image" content="/img/hero.jpg">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
 {"@type":"Organization","name":"Acme Bags","foundingDate":"2004","address":{"addressLocality":"Utrecht","addressCountry":"NL"},"email":"info@acme.test"},
 {"@type":"Product","name":"Jute Shopper","sku":"AB-100","image":"https://acme.test/p/jute.jpg","url":"https://acme.test/products/jute-shopper"}
]}</script>
</head><body>
<nav><a href="/bags">Bags</a><a href="/about">About</a><a href="/fr">Français</a></nav>
<h1>Welcome</h1><p>We print bags with screen printing and embroidery.</p>
<ul>${Array.from({ length: 7 }, (_, i) => `<li><a href="/en/models/m${i}/overview">Model ${i}</a></li>`).join('')}</ul>
<script>1</script><script>2</script>
</body></html>`;

describe('extractHtml', () => {
  const page = extractHtml(PAGE, 'https://acme.test/');

  it('čte titulek, meta popis a absolutní og:image', () => {
    expect(page.title).toBe('Acme Bags');
    expect(page.metaDescription).toContain('sustainable promotional bags');
    expect(page.ogImage).toBe('https://acme.test/img/hero.jpg');
  });

  it('čte organizaci z JSON-LD @graph', () => {
    expect(page.organization).toMatchObject({ foundingDate: '2004', addressLocality: 'Utrecht', addressCountry: 'NL', email: 'info@acme.test' });
  });

  it('najde produkt z JSON-LD i sourozenecké produktové odkazy', () => {
    expect(page.products.find((p) => p.origin === 'json-ld')).toMatchObject({ name: 'Jute Shopper', sku: 'AB-100' });
    expect(page.products.filter((p) => p.url?.includes('/en/models/')).length).toBe(7);
  });

  it('text navigace nevstupuje do textových bloků, odkazy ano', () => {
    expect(page.textBlocks).toContain('We print bags with screen printing and embroidery.');
    expect(page.textBlocks.join(' ')).not.toContain('Français');
    expect(page.links.find((l) => l.text === 'Bags')?.inNav).toBe(true);
  });

  it('rozpozná stránku vykreslovanou JavaScriptem', () => {
    const spa = extractHtml('<html><body><div id="root"></div><script></script><script></script><script></script></body></html>', 'https://spa.test/');
    expect(spa.likelyJsRendered).toBe(true);
    expect(page.likelyJsRendered).toBe(false);
  });
});

describe('extractSitemapUrls', () => {
  it('čte urlset i sitemapindex', () => {
    expect(extractSitemapUrls('<urlset><url><loc>https://a.test/x</loc></url></urlset>').pages).toEqual(['https://a.test/x']);
    expect(extractSitemapUrls('<sitemapindex><sitemap><loc>https://a.test/s.xml</loc></sitemap></sitemapindex>').sitemaps).toEqual(['https://a.test/s.xml']);
  });
});
