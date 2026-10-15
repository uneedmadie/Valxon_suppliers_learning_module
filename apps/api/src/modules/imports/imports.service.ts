/**
 * Orchestrace importu dodavatele: web (crawler) + dokumenty → segmenty s lokacemi →
 * návrhy faktů → produkty a párování bestsellerů → rozpory/chybějící témata →
 * návrhy kapitol a otázek. Běží na pozadí; průběh se ukládá do importní úlohy,
 * takže správce vidí skutečný stav včetně chyb.
 */
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { normalizeWhitespace } from '../../common/text';
import { CHAPTER_DEFINITIONS } from '../chapters/chapter-definitions';
import { ChaptersService } from '../chapters/chapters.service';
import { FactsService } from '../facts/facts.service';
import { DiscoveredProductInput, ProductsService } from '../products/products.service';
import { Source } from '../sources/entities/source.entity';
import { SegmentInput, SourcesService } from '../sources/sources.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { ImportJob, ImportLogEntry, ImportReport } from './entities/import-job.entity';
import { AiExtractionService } from './pipeline/ai-extraction.service';
import { DocumentKind, extractDocument, TableProduct } from './pipeline/document-extractor';
import { detectConflicts, ExtractionSegment, extractFacts, FactCandidate, StructuredHints } from './pipeline/fact-extractor';
import { SiteCrawlerService } from './pipeline/site-crawler.service';

/** Maximální délka segmentu webové stránky (kvůli přesnějším citacím). */
const WEB_SEGMENT_MAX = 1500;

/** Pracovní stav jednoho běhu importu. */
interface RunContext {
  job: ImportJob;
  supplier: Supplier;
  report: ImportReport;
  hints: StructuredHints[];
  discovered: DiscoveredProductInput[];
  extraFacts: FactCandidate[];
}

/** Spouštění a sledování importů. */
@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);
  /** Běžící importy (kvůli testům a čistému vypnutí lze na ně počkat). */
  private readonly running = new Map<string, Promise<void>>();

  constructor(
    @InjectRepository(ImportJob) private readonly jobs: Repository<ImportJob>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    private readonly sources: SourcesService,
    private readonly facts: FactsService,
    private readonly products: ProductsService,
    private readonly chapters: ChaptersService,
    private readonly crawler: SiteCrawlerService,
    private readonly ai: AiExtractionService,
  ) {}

  /**
   * Založí importní úlohu a spustí ji na pozadí.
   * @throws ConflictException pokud pro dodavatele už import běží
   */
  async start(supplierId: string): Promise<ImportJob> {
    const supplier = await this.suppliers.findOneBy({ id: supplierId });
    if (!supplier) throw new NotFoundException('Dodavatel nebyl nalezen.');
    const active = await this.jobs.findOne({ where: { supplierId, status: In(['queued', 'running']) } });
    if (active) throw new ConflictException('Import tohoto dodavatele už probíhá.');

    const sourceCount = (await this.sources.listForSupplier(supplierId)).length;
    if (sourceCount === 0) throw new ConflictException('Dodavatel nemá žádný zdroj – přidejte URL webu nebo nahrajte dokument.');

    const job = await this.jobs.save(this.jobs.create({ supplierId, status: 'queued', log: [], report: null }));
    const promise = this.run(job.id).finally(() => this.running.delete(job.id));
    this.running.set(job.id, promise);
    return job;
  }

  /** Počká na dokončení běžícího importu (využívají testy). */
  async waitFor(jobId: string): Promise<void> {
    await this.running.get(jobId);
  }

  async getOrFail(jobId: string): Promise<ImportJob> {
    const job = await this.jobs.findOneBy({ id: jobId });
    if (!job) throw new NotFoundException('Importní úloha nebyla nalezena.');
    return job;
  }

  /** Poslední importní úloha dodavatele. */
  latestForSupplier(supplierId: string): Promise<ImportJob | null> {
    return this.jobs.findOne({ where: { supplierId }, order: { createdAt: 'DESC' } });
  }

  /** Vlastní běh importu; jakákoli neočekávaná chyba se zapíše do úlohy (nic se nezamlčí). */
  private async run(jobId: string): Promise<void> {
    const job = await this.getOrFail(jobId);
    const supplier = await this.suppliers.findOneByOrFail({ id: job.supplierId });
    const previousStatus = supplier.status;
    const ctx: RunContext = { job, supplier, report: this.emptyReport(), hints: [], discovered: [], extraFacts: [] };
    // Stav AI patří do reportu vždy – i když import selže dřív, než se k AI kroku dojde.
    ctx.report.ai = this.ai.status();

    try {
      job.status = 'running';
      job.startedAt = new Date();
      await this.jobs.save(job);
      if (previousStatus !== 'published') await this.suppliers.update(supplier.id, { status: 'importing' });
      await this.log(ctx, 'info', `Import dodavatele „${supplier.name}“ zahájen.`);

      // 1) Zdroje: weby a dokumenty.
      await this.sources.removeDiscoveredChildren(supplier.id);
      const sources = await this.sources.listForSupplier(supplier.id);
      for (const source of sources) {
        if (source.kind === 'web-root') await this.processWebRoot(ctx, source);
        else if (source.kind === 'pdf' || source.kind === 'docx' || source.kind === 'xlsx') await this.processDocument(ctx, source, source.kind);
      }

      // 2) Fakta ze všech segmentů (oficiální web, dokumenty, vložené texty).
      const segments: ExtractionSegment[] = (await this.sources.segmentsForSupplier(supplier.id)).map(({ segment, source }) => ({
        sourceId: source.id,
        location: source.kind === 'web' || source.kind === 'web-root' ? segment.location : `${source.title}, ${segment.location}`,
        text: segment.text,
        origin: source.origin,
      }));
      ctx.report.sourcesProcessed = (await this.sources.listForSupplier(supplier.id)).filter((s) => s.status === 'processed').length;
      if (segments.length === 0) {
        throw new Error('Z žádného zdroje se nepodařilo získat text. Zkontrolujte URL nebo nahrajte PDF/DOCX/XLSX s textovou vrstvou.');
      }
      const candidates = [...extractFacts(ctx.hints, segments), ...ctx.extraFacts];
      ctx.report.factsCreated = await this.facts.replaceProposed(supplier.id, candidates);
      await this.log(ctx, 'info', `Extrakce faktů: ${ctx.report.factsCreated} nových návrhů z ${segments.length} segmentů.`);

      // 3) Produkty a párování bestsellerů zadaných správcem.
      ctx.report.productsDiscovered = await this.products.saveDiscovered(supplier.id, ctx.discovered);
      await this.log(ctx, 'info', `Produkty: ${ctx.report.productsDiscovered} nalezeno v podkladech (nejsou označeny jako bestsellery).`);
      const enriched = await this.products.enrichDiscovered(supplier.id);
      if (enriched > 0) await this.log(ctx, 'info', `Doplněny originální fotografie a popisy z vlastních stránek ${enriched} produktů.`);
      await this.products.matchBestsellers(supplier.id, (m) => void this.log(ctx, 'info', m));

      // 4) Rozpory a chybějící témata výzkumného plánu.
      const usable = await this.facts.listUsable(supplier.id);
      ctx.report.conflicts = detectConflicts(usable);
      ctx.report.missingTopics = CHAPTER_DEFINITIONS.flatMap((def) =>
        def.expectedTopics.filter((t) => !usable.some((f) => f.kind === t.kind)).map((t) => ({ chapter: def.number, topic: t.topic })),
      );
      for (const c of ctx.report.conflicts) await this.log(ctx, 'warn', `Rozpor (${c.label}): ${c.values.join(' × ')}`);

      // 5) Pravdivý stav AI a návrhy kapitol/otázek.
      await this.log(ctx, 'warn', ctx.report.ai.message);
      const regenerated = await this.chapters.regenerateDrafts(supplier.id);
      await this.log(ctx, 'info', `Návrhy kapitol: ${regenerated} přegenerováno (upravené/schválené kapitoly ponechány).`);

      ctx.report.recommendations = this.recommendations(ctx);
      job.status = ctx.report.failedUrls.length > 0 || ctx.report.sourcesFailed > 0 ? 'completed_with_errors' : 'completed';
      await this.log(ctx, 'info', 'Import dokončen. Zkontrolujte fakta, kapitoly a otázky a poté publikujte.');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Import ${jobId} selhal: ${message}`);
      job.status = 'failed';
      ctx.report.recommendations = [message, ...this.recommendations(ctx)];
      await this.log(ctx, 'error', `Import selhal: ${message}`);
    } finally {
      job.report = ctx.report;
      job.finishedAt = new Date();
      await this.jobs.save(job);
      // Publikovaný dodavatel zůstává publikovaný; jinak přechází do review.
      await this.suppliers.update(supplier.id, { status: previousStatus === 'published' ? 'published' : 'review' });
    }
  }

  /** Zpracuje kořenovou URL: crawl, uložení podstránek a PDF jako zdrojů se segmenty. */
  private async processWebRoot(ctx: RunContext, root: Source): Promise<void> {
    if (!root.url) return;
    await this.log(ctx, 'info', `Načítám web ${root.url} (robots.txt, sitemap, cílené podstránky)…`);
    const crawl = await this.crawler.crawl(root.url, (level, message) => void this.log(ctx, level, message));
    ctx.report.failedUrls.push(...crawl.failures, ...crawl.blocked);
    ctx.report.pagesFetched += crawl.pages.length;
    ctx.report.jsRenderingSuspected ||= crawl.jsRenderingSuspected;

    if (crawl.pages.length === 0) {
      const reason = crawl.blocked[0]?.reason ?? crawl.failures[0]?.reason ?? 'Web se nepodařilo načíst.';
      await this.sources.setStatus(root, crawl.blocked.length > 0 ? 'blocked' : 'failed', reason);
      ctx.report.sourcesFailed++;
      return;
    }

    const host = new URL(crawl.pages[0].url).hostname;
    for (const page of crawl.pages) {
      // Kořenová stránka se ukládá do zdroje správce, podstránky jako samostatné zdroje.
      const source = page.isRoot
        ? root
        : await this.sources.createDiscovered({ supplierId: ctx.supplier.id, kind: 'web', title: page.page.title.slice(0, 300), url: page.url, parentSourceId: root.id });
      await this.sources.replaceSegments(source, this.webSegments(page.url, page.page.textBlocks, page.page.metaDescription));
      ctx.hints.push({
        sourceId: source.id,
        location: page.url,
        origin: root.origin,
        isHomepage: page.isRoot,
        metaDescription: page.page.metaDescription,
        ogImage: page.page.ogImage,
        organization: page.page.organization,
        navLinks: page.page.links,
        siteHost: host,
        productUrls: page.page.products.map((p) => p.url).filter((u): u is string => Boolean(u)),
      });
      for (const p of page.page.products) {
        ctx.discovered.push({ name: p.name, url: p.url, sku: p.sku, imageUrl: p.imageUrl, description: p.description, material: p.material, category: null, sourceId: source.id, location: page.url });
      }
    }

    // Upozornění na JS web: pravdivě, s nabídkou alternativního podkladu.
    const warnings = crawl.jsRenderingSuspected
      ? ['Web se vykresluje převážně JavaScriptem; bez serverového prohlížeče byl získán jen omezený text. Nahrajte PDF katalog nebo export stránek.']
      : null;
    root.title = crawl.pages[0].page.title.slice(0, 300) || root.title;
    await this.sources.setStatus(root, 'processed', null, warnings);

    for (const pdf of crawl.pdfs) {
      const source = await this.sources.createDiscovered({ supplierId: ctx.supplier.id, kind: 'pdf', title: pdf.title.slice(0, 300), url: pdf.url, parentSourceId: root.id });
      await this.extractInto(ctx, source, 'pdf', pdf.body);
    }
  }

  /** Zpracuje nahraný dokument z lokálního úložiště. */
  private async processDocument(ctx: RunContext, source: Source, kind: DocumentKind): Promise<void> {
    if (!source.storedFileName) return;
    await this.log(ctx, 'info', `Zpracovávám dokument ${source.title}…`);
    try {
      await this.extractInto(ctx, source, kind, await this.sources.readFile(source));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.sources.setStatus(source, 'failed', message);
      ctx.report.sourcesFailed++;
      await this.log(ctx, 'error', message);
    }
  }

  /** Extrahuje dokument do segmentů zdroje; z tabulek bere i produkty a kategorie. */
  private async extractInto(ctx: RunContext, source: Source, kind: DocumentKind, body: Buffer): Promise<void> {
    try {
      const doc = await extractDocument(kind, body);
      await this.sources.replaceSegments(source, doc.segments);
      await this.sources.setStatus(source, 'processed', null, doc.warnings);
      for (const w of doc.warnings) await this.log(ctx, 'warn', `${source.title}: ${w}`);
      await this.log(ctx, 'info', `${source.title}: ${doc.segments.length} segmentů${doc.pageCount ? `, ${doc.pageCount} stran` : ''}${doc.products.length ? `, ${doc.products.length} produktových řádků` : ''}.`);
      this.collectTableProducts(ctx, source, doc.products);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.sources.setStatus(source, 'failed', message);
      ctx.report.sourcesFailed++;
      await this.log(ctx, 'error', `${source.title}: ${message}`);
    }
  }

  /** Produkty a kategorie z tabulky (XLSX) – kategorie jako návrhy faktů kapitoly 3. */
  private collectTableProducts(ctx: RunContext, source: Source, rows: TableProduct[]): void {
    const categories = new Map<string, string>();
    for (const row of rows) {
      ctx.discovered.push({ name: row.name, url: null, sku: row.sku, imageUrl: null, description: row.description, material: row.material, category: row.category, sourceId: source.id, location: `${source.title}, ${row.location}` });
      if (row.category && !categories.has(row.category)) categories.set(row.category, row.location);
    }
    for (const [category, location] of categories) {
      ctx.extraFacts.push({ chapter: 3, kind: 'category', label: 'Kategorie (tabulka)', value: category, quote: `Kategorie v tabulce: ${category}`, sourceId: source.id, location: `${source.title}, ${location}`, origin: 'official', confidence: 'medium' });
    }
  }

  /** Seskupí textové bloky webové stránky do segmentů s lokací = URL stránky. */
  private webSegments(url: string, blocks: string[], metaDescription: string | null): SegmentInput[] {
    const segments: SegmentInput[] = [];
    let current = metaDescription ? `${metaDescription}` : '';
    for (const block of blocks) {
      const text = normalizeWhitespace(block);
      if ((current + '\n' + text).length > WEB_SEGMENT_MAX && current) {
        segments.push({ location: url, text: current });
        current = text;
      } else {
        current = current ? `${current}\n${text}` : text;
      }
    }
    if (current) segments.push({ location: url, text: current });
    return segments;
  }

  /** Doporučení pro správce podle výsledku (co doplnit ručně). */
  private recommendations(ctx: RunContext): string[] {
    const r: string[] = [];
    if (ctx.report.jsRenderingSuspected) r.push('Web je JavaScriptová aplikace – serverový prohlížeč (Playwright) není v této verzi zapojen. Nahrajte PDF katalog/obchodní podmínky nebo vložte text stránek.');
    if (ctx.report.failedUrls.length > 0) r.push(`${ctx.report.failedUrls.length} URL se nepodařilo načíst – viz seznam selhání.`);
    for (const m of ctx.report.missingTopics) r.push(`Kapitola ${m.chapter}: chybí „${m.topic}“ – doplňte z podkladů ručně, nebo ponechte prázdné (nevymýšlet).`);
    if (ctx.report.conflicts.length > 0) r.push('Vyřešte rozpory: ověřte správnou hodnotu a ostatní zamítněte.');
    r.push('Seznam TOP 10 bestsellerů musí dodat správce; bez něj bude kapitola 4 označena jako „Reprezentativní výběr produktů“.');
    return r;
  }

  private emptyReport(): ImportReport {
    return {
      sourcesProcessed: 0,
      sourcesFailed: 0,
      pagesFetched: 0,
      factsCreated: 0,
      productsDiscovered: 0,
      failedUrls: [],
      missingTopics: [],
      conflicts: [],
      recommendations: [],
      ai: { status: 'unavailable', message: '' },
      jsRenderingSuspected: false,
    };
  }

  /** Zapíše řádek logu do úlohy (a průběžně ji uloží, aby UI vidělo postup). */
  private async log(ctx: RunContext, level: ImportLogEntry['level'], message: string): Promise<void> {
    ctx.job.log = [...ctx.job.log, { at: new Date().toISOString(), level, message }].slice(-400);
    await this.jobs.update(ctx.job.id, { log: ctx.job.log, status: ctx.job.status });
  }
}
