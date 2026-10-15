/**
 * Testy parseru robots.txt.
 */
import { isPathAllowed, parseRobots } from './robots';

const ROBOTS = `
User-agent: *
Disallow: /private/
Disallow: /*.pdf$
Allow: /private/public-page
Crawl-delay: 2
Sitemap: https://example.com/sitemap.xml

User-agent: BadBot
Disallow: /
`;

describe('robots', () => {
  const rules = parseRobots(ROBOTS, 'ValxonAcademyImporter');

  it('respektuje Disallow pro *', () => {
    expect(isPathAllowed(rules, '/private/secret')).toBe(false);
    expect(isPathAllowed(rules, '/about')).toBe(true);
  });

  it('delší Allow má přednost', () => expect(isPathAllowed(rules, '/private/public-page')).toBe(true));
  it('podporuje zástupné znaky a $', () => {
    expect(isPathAllowed(rules, '/files/catalog.pdf')).toBe(false);
    expect(isPathAllowed(rules, '/files/catalog.pdf?x=1')).toBe(true);
  });
  it('čte sitemap a crawl-delay', () => {
    expect(rules.sitemaps).toEqual(['https://example.com/sitemap.xml']);
    expect(rules.crawlDelaySeconds).toBe(2);
  });
  it('specifická skupina má přednost před *', () => {
    const bad = parseRobots(ROBOTS, 'BadBot');
    expect(isPathAllowed(bad, '/about')).toBe(false);
  });
});
