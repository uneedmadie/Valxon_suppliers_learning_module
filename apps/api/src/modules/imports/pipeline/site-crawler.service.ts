/**
 * Cílený crawler oficiálního webu dodavatele. Nestahuje „celý internet“: podle výzkumného
 * plánu sedmi kapitol vybírá podstránky (About, History, Vision, Products, Printing, Delivery,
 * FAQ, Terms, Contact) z odkazů a sitemap, respektuje robots.txt, prodlevy a limit stránek.
 */
import { Injectable } from '@nestjs/common';
import { setTimeout as sleep } from 'node:timers/promises';
import { AppConfig } from '../../../config/app-config';
import { ExtractedPage, extractHtml, extractSitemapUrls } from './html-extractor';
import { EMPTY_ROBOTS, isPathAllowed, parseRobots, RobotsRules } from './robots';
import { assertImportableUrl, FetchError, IMPORTER_USER_AGENT, SafeHttpClient } from './safe-http.client';

/** Úspěšně stažená a rozparsovaná stránka. */
export interface CrawledPage {
  url: string;
  topic: string;
  page: ExtractedPage;
  isRoot: boolean;
}

/** PDF dokument nalezený na webu dodavatele (katalog, obchodní podmínky). */
export interface CrawledPdf {
  url: string;
  title: string;
  body: Buffer;
}

/** Výsledek procházení webu. */
export interface CrawlResult {
  pages: CrawledPage[];
  pdfs: CrawledPdf[];
  failures: { url: string; reason: string }[];
  blocked: { url: string; reason: string }[];
  jsRenderingSuspected: boolean;
  sitemapUrlsFound: number;
}

/** Callback pro průběžný log importu. */
export type CrawlLogger = (level: 'info' | 'warn' | 'error', message: string) => void;

/** Témata podstránek odvozená z výzkumného plánu kapitol (vzor URL/textu odkazu → priorita). */
const TOPICS: { topic: string; pattern: RegExp; priority: number; max: number }[] = [
  { topic: 'about', pattern: /(about|o-nas|onas|over-ons|ueber-uns|uber-uns|wie-zijn-wij|who-we-are|our-story|story|company|unternehmen|bedrijf|pribeh)/, priority: 10, max: 2 },
  { topic: 'products', pattern: /(products?|produkty|producten|produkte|collections?|catalog|sortiment|assortiment|range|categor)/, priority: 9, max: 3 },
  { topic: 'printing', pattern: /(print|branding|decoration|personali[sz]|imprint|logo|techni|bedruk|druck|potisk|zuslechteni|embroider|veredel)/, priority: 9, max: 2 },
  { topic: 'delivery', pattern: /(deliver|shipping|transport|lead-?time|dodaci|doprava|levering|verzend|lieferung|versand)/, priority: 8, max: 2 },
  { topic: 'faq', pattern: /(faq|questions|vragen|fragen|otazky|how-to-order|ordering)/, priority: 8, max: 1 },
  { topic: 'vision', pattern: /(vision|mission|vize|mise|purpose|values|hodnoty|waarden|werte)/, priority: 8, max: 1 },
  { topic: 'history', pattern: /(history|historie|geschiedenis|geschichte|timeline|milestones?)/, priority: 8, max: 1 },
  { topic: 'sustainability', pattern: /(sustainab|duurzaam|nachhaltig|udrzitel|impact|csr|responsib|environment|esg|(^|[/ -])eco($|[/ -]))/, priority: 7, max: 1 },
  { topic: 'terms', pattern: /(terms|conditions|voorwaarden|agb|podminky|obchodni)/, priority: 6, max: 1 },
  { topic: 'samples', pattern: /(sample|vzor|muster|monster|stalen)/, priority: 6, max: 1 },
  { topic: 'contact', pattern: /(contact|kontakt)/, priority: 5, max: 1 },
];

/** URL, které nikdy neprocházíme (účty, košík, média, archivy). */
const SKIP_URL = /(login|logout|account|cart|basket|checkout|wp-admin|wp-json|\/tag\/|\/author\/|\/page\/\d+|\?add-to-cart|\.(jpe?g|png|gif|webp|svg|zip|rar|mp4|mp3|docx?|xlsx?|css|js)(\?|$))/i;

/** PDF odkazy, které mají smysl jako podklad (katalog, podmínky) – ceníky záměrně ne. */
const USEFUL_PDF = /(catalog|catalogue|katalog|brochure|terms|conditions|voorwaarden|agb|podminky|delivery|general)/i;

const HTML_MAX_BYTES = 5 * 1024 * 1024;
const PDF_MAX_BYTES = 20 * 1024 * 1024;
const MAX_PDFS = 2;

/** Procházení webu dodavatele. */
@Injectable()
export class SiteCrawlerService {
  /** Mezipaměť pravidel robots.txt podle originu (po dobu běhu procesu). */
  private readonly robotsCache = new Map<string, RobotsRules>();

  constructor(
    private readonly http: SafeHttpClient,
    private readonly config: AppConfig,
  ) {}

  /**
   * Projde web od zadané URL.
   * @param rootUrl URL zadaná správcem
   * @param log průběžný log (zapisuje se do importní úlohy)
   */
  async crawl(rootUrl: string, log: CrawlLogger): Promise<CrawlResult> {
    const result: CrawlResult = { pages: [], pdfs: [], failures: [], blocked: [], jsRenderingSuspected: false, sitemapUrlsFound: 0 };
    let root: URL;
    try {
      root = assertImportableUrl(rootUrl, this.config.importAllowPrivateHosts);
    } catch (error) {
      result.failures.push({ url: rootUrl, reason: error instanceof Error ? error.message : String(error) });
      return result;
    }

    // 1) robots.txt – pokud zakazuje náš přístup, import webu pravdivě označíme jako blokovaný.
    const robots = await this.loadRobots(root, log);
    this.robotsCache.set(root.origin, robots);
    if (!isPathAllowed(robots, root.pathname + root.search)) {
      result.blocked.push({ url: root.toString(), reason: 'Přístup zakazuje robots.txt webu.' });
      log('warn', `robots.txt zakazuje ${root.toString()} – web nebyl stažen.`);
      return result;
    }
    const delayMs = Math.max(this.config.importRequestDelayMs, Math.min((robots.crawlDelaySeconds ?? 0) * 1000, 5000));

    // 2) Úvodní stránka.
    const rootPage = await this.fetchPage(root.toString(), 'home', true, result, log);
    if (!rootPage) return result;
    const siteHost = new URL(rootPage.url).hostname.replace(/^www\./, '');
    const sameSite = (u: string): boolean => {
      try {
        return new URL(u).hostname.replace(/^www\./, '') === siteHost;
      } catch {
        return false;
      }
    };

    // 3) Kandidáti: odkazy z úvodní stránky + sitemap (pomáhá u JS webů s málo odkazy v HTML).
    const candidates = new Map<string, string>();
    for (const link of rootPage.page.links) if (sameSite(link.url)) candidates.set(link.url, link.text);
    const sitemapUrls = await this.loadSitemapUrls(root, robots, log);
    result.sitemapUrlsFound = sitemapUrls.length;
    for (const url of sitemapUrls) if (sameSite(url) && !candidates.has(url)) candidates.set(url, '');

    // 4) PDF podklady odkazované z webu (katalog, obchodní podmínky).
    const pdfLinks = [...candidates.entries()]
      .filter(([url, text]) => /\.pdf(\?|$)/i.test(url) && USEFUL_PDF.test(`${decodeURIComponent(url)} ${text}`))
      .slice(0, MAX_PDFS);
    for (const [url, text] of pdfLinks) {
      if (!isPathAllowed(robots, new URL(url).pathname)) continue;
      await sleep(delayMs);
      try {
        const fetched = await this.http.fetch(url, { maxBytes: PDF_MAX_BYTES, accept: 'application/pdf' });
        result.pdfs.push({ url: fetched.finalUrl, title: text || decodeURIComponent(url.split('/').pop() ?? 'PDF'), body: fetched.body });
        log('info', `Staženo PDF z webu: ${fetched.finalUrl}`);
      } catch (error) {
        result.failures.push({ url, reason: error instanceof FetchError ? error.message : String(error) });
      }
    }

    // 5) Výběr podstránek podle témat kapitol a priority.
    const selected = this.selectPages(candidates, root, rootPage.url, rootPage.page.lang);
    log('info', `Vybráno ${selected.length} podstránek podle témat kapitol (z ${candidates.size} kandidátů).`);

    // 6) Stažení vybraných stránek s prodlevou a kontrolou robots.txt.
    for (const { url, topic } of selected) {
      const parsed = new URL(url);
      if (!isPathAllowed(robots, parsed.pathname + parsed.search)) {
        result.blocked.push({ url, reason: 'Zakázáno v robots.txt.' });
        continue;
      }
      await sleep(delayMs);
      await this.fetchPage(url, topic, false, result, log);
    }

    result.jsRenderingSuspected = result.pages.length > 0 && result.pages.filter((p) => p.page.likelyJsRendered).length >= Math.ceil(result.pages.length / 2);
    return result;
  }

  /**
   * Ověří, zda robots.txt povoluje načíst danou URL (s mezipamětí pro hostitele).
   * Používá se i mimo crawl – např. při stahování stránek produktů a bestsellerů.
   */
  async robotsAllows(url: string): Promise<boolean> {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    let rules = this.robotsCache.get(parsed.origin);
    if (!rules) {
      rules = await this.loadRobots(parsed, () => undefined).catch(() => EMPTY_ROBOTS);
      this.robotsCache.set(parsed.origin, rules);
    }
    return isPathAllowed(rules, parsed.pathname + parsed.search);
  }

  /** Stáhne a rozparsuje jednu HTML stránku; chyby zapíše do výsledku (nic nepředstírá). */
  private async fetchPage(url: string, topic: string, isRoot: boolean, result: CrawlResult, log: CrawlLogger): Promise<CrawledPage | null> {
    try {
      const fetched = await this.http.fetch(url, { maxBytes: HTML_MAX_BYTES, accept: 'text/html,application/xhtml+xml' });
      if (!fetched.contentType.includes('html')) {
        result.failures.push({ url, reason: `Odpověď není HTML (${fetched.contentType || 'neznámý typ'}).` });
        return null;
      }
      const page = extractHtml(fetched.body.toString('utf8'), fetched.finalUrl);
      const crawled: CrawledPage = { url: fetched.finalUrl, topic, page, isRoot };
      result.pages.push(crawled);
      log(page.likelyJsRendered ? 'warn' : 'info', `${isRoot ? 'Úvodní stránka' : `Podstránka (${topic})`}: ${fetched.finalUrl} – ${page.visibleTextLength} znaků textu${page.likelyJsRendered ? ', stránka se zřejmě vykresluje JavaScriptem' : ''}.`);
      return crawled;
    } catch (error) {
      const reason = error instanceof FetchError ? error.message : error instanceof Error ? error.message : String(error);
      result.failures.push({ url, reason });
      log('error', `Nepodařilo se načíst ${url}: ${reason}`);
      return null;
    }
  }

  /** Načte robots.txt; 404 nebo chyba = žádná omezení (standardní chování crawlerů). */
  private async loadRobots(root: URL, log: CrawlLogger): Promise<RobotsRules> {
    try {
      const fetched = await this.http.fetch(new URL('/robots.txt', root).toString(), { maxBytes: 512 * 1024, accept: 'text/plain' });
      return parseRobots(fetched.body.toString('utf8'), IMPORTER_USER_AGENT.split('/')[0] ?? 'ValxonAcademyImporter');
    } catch (error) {
      if (error instanceof FetchError && error.code === 'blocked_address') throw error;
      log('info', 'robots.txt nenalezen nebo nedostupný – pokračuji se standardními limity.');
      return EMPTY_ROBOTS;
    }
  }

  /** Načte URL ze sitemap (robots `Sitemap:` nebo `/sitemap.xml`, jedna úroveň indexu). */
  private async loadSitemapUrls(root: URL, robots: RobotsRules, log: CrawlLogger): Promise<string[]> {
    const queue = robots.sitemaps.length > 0 ? robots.sitemaps.slice(0, 3) : [new URL('/sitemap.xml', root).toString()];
    const pages: string[] = [];
    for (let i = 0; i < queue.length && i < 6; i++) {
      try {
        const fetched = await this.http.fetch(queue[i], { maxBytes: 5 * 1024 * 1024, accept: 'application/xml,text/xml' });
        const parsed = extractSitemapUrls(fetched.body.toString('utf8'));
        pages.push(...parsed.pages);
        // Sitemap index: přednostně podmapy stránek/produktů/kategorií.
        const nested = parsed.sitemaps.sort((a, b) => Number(/page|categor|product/i.test(b)) - Number(/page|categor|product/i.test(a)));
        for (const s of nested) if (queue.length < 6) queue.push(s);
      } catch {
        // Chybějící sitemap není chyba importu.
      }
      if (pages.length > 3000) break;
    }
    if (pages.length > 0) log('info', `Sitemap: nalezeno ${pages.length} URL.`);
    return pages.slice(0, 3000);
  }

  /**
   * Vybere podstránky k načtení: každé URL přiřadí téma podle cesty/textu odkazu,
   * seřadí podle priority a hloubky a respektuje maximum stránek na téma.
   */
  private selectPages(candidates: Map<string, string>, root: URL, rootFinalUrl: string, rootLang: string | null): { url: string; topic: string }[] {
    // Preferovaný jazyk: prefix v URL zadané správcem, jinak jazyk úvodní stránky (<html lang>).
    const langOf = (pathname: string): string | null => /^\/([a-z]{2})(?:[-_][a-z]{2})?(?:\/|$)/i.exec(pathname)?.[1]?.toLowerCase() ?? null;
    const langPrefix = langOf(root.pathname) ?? rootLang?.slice(0, 2).toLowerCase() ?? null;
    const scored: { url: string; topic: string; score: number }[] = [];
    for (const [url, text] of candidates) {
      if (url === rootFinalUrl || url === root.toString() || SKIP_URL.test(url) || /\.pdf(\?|$)/i.test(url)) continue;
      const path = decodeURIComponent(new URL(url).pathname).toLowerCase();
      const haystack = `${path} ${text.toLowerCase()}`;
      const topic = TOPICS.find((t) => t.pattern.test(haystack));
      if (!topic) continue;
      const depth = path.split('/').filter(Boolean).length;
      let score = topic.priority - depth * 0.4;
      // Stejná jazyková verze jako úvodní stránka; jiné jazykové mutace se nestahují
      // (stejný obsah v jiném jazyce by jen duplikoval a míchal citace).
      const candidateLang = langOf(path);
      if (langPrefix && candidateLang && candidateLang !== langPrefix) continue;
      if (langPrefix && candidateLang === langPrefix) score += 1.5;
      if (text && topic.pattern.test(text.toLowerCase())) score += 1;
      scored.push({ url, topic: topic.topic, score });
    }
    scored.sort((a, b) => b.score - a.score);

    const perTopic = new Map<string, number>();
    const selected: { url: string; topic: string }[] = [];
    for (const item of scored) {
      if (selected.length >= this.config.importMaxPages - 1) break;
      const max = TOPICS.find((t) => t.topic === item.topic)?.max ?? 1;
      const count = perTopic.get(item.topic) ?? 0;
      if (count >= max) continue;
      perTopic.set(item.topic, count + 1);
      selected.push({ url: item.url, topic: item.topic });
    }
    return selected;
  }
}
