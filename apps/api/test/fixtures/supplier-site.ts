/**
 * Lokální HTTP server s webem FIKTIVNÍHO dodavatele „Nordlicht Werbetextil“ pro e2e testy.
 * Obsahuje robots.txt se zákazem, sitemapu, stránky O nás / Potisk / FAQ / Kontakt a produktový výpis.
 */
import { createServer, Server } from 'node:http';
import type { AddressInfo } from 'node:net';

const layout = (title: string, body: string): string => `<!doctype html><html lang="en"><head><title>${title}</title>
<meta name="description" content="Nordlicht Werbetextil is a supplier of sustainable promotional textiles and bags.">
<meta property="og:image" content="/img/hero.jpg"></head><body>
<nav><a href="/">Home</a><a href="/about-us">About us</a><a href="/bags">Bags</a><a href="/towels">Towels</a><a href="/printing">Printing</a><a href="/faq">FAQ</a><a href="/contact">Contact</a><a href="/de">Deutsch</a></nav>
${body}</body></html>`;

const PAGES: Record<string, string> = {
  '/': layout('Nordlicht Werbetextil', `<h1>Promotional textiles with a story</h1>
<p>We specialize in organic cotton bags and towels for corporate gifts.</p>
<a href="/private/about-internal">About internal</a>
<ul>${['Jute Shopper', 'Cotton Tote', 'Canvas Bag', 'Beach Towel', 'Guest Towel', 'Sauna Towel'].map((n, i) => `<li><a href="/products/item-${i}"><img src="/img/p${i}.jpg" alt="${n}">${n}</a></li>`).join('')}</ul>`),
  '/about-us': layout('About us', `<h1>About us</h1><p>Nordlicht Werbetextil was founded in 2004 in Hamburg.</p>
<p>Our mission is to make promotional textiles circular.</p><p>In 2015 we opened our own embroidery studio.</p>`),
  '/printing': layout('Printing', `<h1>Printing</h1><p>We offer screen printing and embroidery on all bags.</p><p>The maximum print area on bags is 30 x 30 cm.</p>`),
  '/faq': layout('FAQ', `<h1>FAQ</h1><p>The minimum order quantity is 100 pieces per colour.</p>
<p>Delivery time is 15 working days after proof approval.</p><p>Samples are available for 10 EUR per piece.</p><p>Complaints must be reported within 8 days of delivery.</p>`),
  '/contact': layout('Contact', `<h1>Contact</h1><address>Nordlicht Werbetextil GmbH, Hafenstraße 5, 20457 Hamburg, Germany</address><p>Write to sales@nordlicht.test</p>`),
  '/private/about-internal': layout('Internal', '<p>Should never be fetched.</p>'),
};

/** Spustí server na náhodném portu a vrátí jeho základní URL. */
export async function startSupplierSite(): Promise<{ url: string; server: Server; requested: string[] }> {
  const requested: string[] = [];
  const server = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    requested.push(path);
    if (path === '/robots.txt') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('User-agent: *\nDisallow: /private/\n');
    }
    if (path === '/sitemap.xml') {
      res.writeHead(404);
      return res.end();
    }
    if (path.startsWith('/products/')) {
      const index = Number(path.split('-').pop());
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      return res.end(layout(`Product ${index}`, `<script type="application/ld+json">{"@type":"Product","name":"Product ${index}","sku":"NL-10${index}","image":"/img/p${index}.jpg"}</script><p>Product page</p>`));
    }
    const page = PAGES[path];
    if (!page) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(page);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}/`, server, requested };
}
