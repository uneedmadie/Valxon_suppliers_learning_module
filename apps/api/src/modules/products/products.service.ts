/**
 * Služba produktů: seznam bestsellerů od správce, produkty objevené v podkladech,
 * párování bestsellerů (URL/SKU/název) a ruční potvrzení správcem.
 */
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { setTimeout as sleep } from 'node:timers/promises';
import { Repository } from 'typeorm';
import { AppConfig } from '../../config/app-config';
import { normalizeForMatch, truncate } from '../../common/text';
import { extractHtml } from '../imports/pipeline/html-extractor';
import { SafeHttpClient } from '../imports/pipeline/safe-http.client';
import { SiteCrawlerService } from '../imports/pipeline/site-crawler.service';
import { UpdateProductDto } from './dto/product.dto';
import { Product } from './entities/product.entity';
import { matchBestseller, MatchableProduct } from './product-matching';

/** Produkt objevený importem (web, JSON-LD, tabulka). */
export interface DiscoveredProductInput {
  name: string;
  url: string | null;
  sku: string | null;
  imageUrl: string | null;
  description: string | null;
  material: string | null;
  category: string | null;
  sourceId: string | null;
  location: string;
}

const MAX_DISCOVERED = 80;

/** Správa produktů dodavatele. */
@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);
  /** Úvodní (obecný) obrázek webu podle originu – ten nikdy není fotografií konkrétního produktu. */
  private readonly siteImageCache = new Map<string, string | null>();

  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly http: SafeHttpClient,
    private readonly crawler: SiteCrawlerService,
    private readonly config: AppConfig,
  ) {}

  /**
   * Doplní objeveným produktům bez fotografie originální obrázek a popis z JEJICH VLASTNÍ
   * stránky (JSON-LD / Open Graph). Nikdy nepřebírá fotku z jiné stránky ani „podobného“ produktu.
   * @returns počet obohacených produktů
   */
  async enrichDiscovered(supplierId: string, limit = 12): Promise<number> {
    const candidates = (await this.products.find({ where: { supplierId, listType: 'discovered' }, order: { position: 'ASC' } }))
      .filter((p) => p.productUrl && !p.imageUrl)
      .slice(0, limit);
    let enriched = 0;
    for (const product of candidates) {
      const page = await this.fetchProductPage(product.productUrl!);
      if (!page?.imageUrl || (await this.isImageUsedElsewhere(supplierId, page.imageUrl))) continue;
      product.imageUrl = page.imageUrl;
      product.imageSourceUrl = page.url;
      product.description ??= page.description;
      product.material ??= page.material;
      product.sku ??= page.sku;
      await this.products.save(product);
      enriched++;
    }
    return enriched;
  }

  list(supplierId: string): Promise<Product[]> {
    return this.products.find({ where: { supplierId }, order: { listType: 'ASC', position: 'ASC', createdAt: 'ASC' } });
  }

  async getOrFail(id: string): Promise<Product> {
    const product = await this.products.findOneBy({ id });
    if (!product) throw new NotFoundException('Produkt nebyl nalezen.');
    return product;
  }

  /**
   * Nahradí seznam bestsellerů. Bestseller vzniká VÝHRADNĚ z tohoto vstupu správce;
   * importér ani párování nikdy neoznačí produkt za bestseller samy.
   */
  async replaceBestsellers(supplierId: string, items: { name: string; sku?: string; url?: string }[]): Promise<Product[]> {
    await this.products.delete({ supplierId, listType: 'bestseller' });
    const rows = items.slice(0, 10).map((item, i) =>
      this.products.create({
        supplierId,
        listType: 'bestseller',
        position: i + 1,
        inputName: item.name.trim(),
        inputSku: item.sku?.trim() || null,
        inputUrl: item.url?.trim() || null,
        name: item.name.trim(),
        matchStatus: 'pending',
        showInLesson: false,
      }),
    );
    return this.products.save(rows);
  }

  /**
   * Uloží produkty objevené importem. Produkty, které správce už zařadil do lekce,
   * zůstávají beze změny; ostatní se nahradí novým výsledkem (deduplikace podle URL/názvu).
   */
  async saveDiscovered(supplierId: string, items: DiscoveredProductInput[]): Promise<number> {
    const existing = await this.products.find({ where: { supplierId, listType: 'discovered' } });
    const kept = existing.filter((p) => p.showInLesson);
    const toDelete = existing.filter((p) => !p.showInLesson);
    if (toDelete.length > 0) await this.products.remove(toDelete);

    const keyOf = (name: string, url: string | null): string => url ?? `name:${normalizeForMatch(name)}`;
    const seen = new Set(kept.map((p) => keyOf(p.name, p.productUrl)));
    const rows: Product[] = [];
    for (const item of items) {
      const key = keyOf(item.name, item.url);
      if (seen.has(key) || rows.length >= MAX_DISCOVERED) continue;
      seen.add(key);
      rows.push(
        this.products.create({
          supplierId,
          listType: 'discovered',
          position: rows.length + 1,
          name: truncate(item.name, 300),
          sku: item.sku?.slice(0, 120) ?? null,
          productUrl: item.url,
          imageUrl: item.imageUrl,
          imageSourceUrl: item.imageUrl ? item.url ?? item.location : null,
          description: item.description ? truncate(item.description, 2000) : null,
          material: item.material ? truncate(item.material, 300) : null,
          category: item.category ? truncate(item.category, 300) : null,
          matchStatus: 'matched',
          showInLesson: false,
          sourceId: item.sourceId,
          location: item.location.slice(0, 400),
        }),
      );
    }
    for (let i = 0; i < rows.length; i += 100) await this.products.save(rows.slice(i, i + 100));
    return rows.length;
  }

  /**
   * Spáruje bestsellery správce s podklady. Pokud správce zadal URL produktu,
   * stáhne se přímo tato stránka (originální název a fotografie z ní). Jinak se hledá
   * v objevených produktech podle SKU a názvu. Nejasné shody zůstávají k ručnímu potvrzení.
   */
  async matchBestsellers(supplierId: string, log?: (message: string) => void): Promise<void> {
    const all = await this.list(supplierId);
    const bestsellers = all.filter((p) => p.listType === 'bestseller' && p.matchStatus !== 'confirmed');
    const pool: MatchableProduct[] = all
      .filter((p) => p.listType === 'discovered')
      .map((p) => ({ name: p.name, url: p.productUrl, sku: p.sku, imageUrl: p.imageUrl, location: p.location ?? p.productUrl ?? '' }));

    for (const product of bestsellers) {
      // 1) URL zadaná správcem: stáhneme přímo stránku produktu.
      if (product.inputUrl) {
        const fromPage = await this.fetchProductPage(product.inputUrl);
        if (fromPage) {
          Object.assign(product, {
            name: fromPage.name,
            sku: fromPage.sku ?? product.inputSku,
            productUrl: fromPage.url,
            imageUrl: fromPage.imageUrl,
            imageSourceUrl: fromPage.imageUrl ? fromPage.url : null,
            description: fromPage.description,
            material: fromPage.material,
            matchStatus: 'matched',
            candidates: [{ name: fromPage.name, url: fromPage.url, sku: fromPage.sku, imageUrl: fromPage.imageUrl, score: 1, location: fromPage.url }],
            showInLesson: true,
            location: fromPage.url,
          });
          await this.products.save(product);
          log?.(`Bestseller „${product.inputName}“ spárován přes zadanou URL.`);
          continue;
        }
        log?.(`Stránku bestselleru „${product.inputName}“ (${product.inputUrl}) se nepodařilo načíst – zkouším SKU/název.`);
      }

      // 2) Párování podle SKU/názvu mezi objevenými produkty.
      const result = matchBestseller({ name: product.inputName ?? product.name, sku: product.inputSku, url: product.inputUrl }, pool);
      product.candidates = result.candidates;
      product.matchStatus = result.status;
      if (result.match) {
        product.name = result.match.name;
        product.sku = result.match.sku ?? product.inputSku;
        product.productUrl = result.match.url;
        product.imageUrl = result.match.imageUrl;
        product.imageSourceUrl = result.match.imageUrl ? result.match.url ?? result.match.location : null;
        product.location = result.match.location;
        product.showInLesson = true;
      }
      await this.products.save(product);
      log?.(`Bestseller „${product.inputName}“: ${result.status === 'matched' ? 'spárován' : result.status === 'ambiguous' ? `${result.candidates.length} kandidátů k ručnímu potvrzení` : 'v podkladech nenalezen'}.`);
    }
  }

  /**
   * Přidá produkt do reprezentativního výběru podle URL jeho stránky (u webů bez
   * produktového výpisu). Název, popis a fotografie pocházejí přímo z té stránky.
   * Nejde o bestseller – ten může určit jen seznam správce.
   * @throws BadRequestException pokud stránku nelze bezpečně načíst
   */
  async addFromUrl(supplierId: string, url: string): Promise<Product> {
    const page = await this.fetchProductPage(url);
    if (!page) throw new BadRequestException('Stránku produktu se nepodařilo načíst (síť, robots.txt nebo chybějící název).');
    // Stejný obrázek u jiného produktu = obecný obrázek webu, ne fotografie tohoto výrobku.
    if (page.imageUrl && (await this.isImageUsedElsewhere(supplierId, page.imageUrl))) page.imageUrl = null;
    const count = await this.products.countBy({ supplierId, listType: 'discovered' });
    return this.products.save(
      this.products.create({
        supplierId,
        listType: 'discovered',
        position: count + 1,
        name: page.name,
        sku: page.sku,
        productUrl: page.url,
        imageUrl: page.imageUrl,
        imageSourceUrl: page.imageUrl ? page.url : null,
        description: page.description,
        material: page.material,
        matchStatus: 'matched',
        showInLesson: true,
        location: page.url,
      }),
    );
  }

  /** Zda obrázek už používá jiný produkt dodavatele (sdílený obrázek nemůže být fotkou konkrétního výrobku). */
  private async isImageUsedElsewhere(supplierId: string, imageUrl: string): Promise<boolean> {
    return this.products.existsBy({ supplierId, imageUrl });
  }

  /** Úvodní obrázek webu (og:image domovské stránky), s mezipamětí podle originu. */
  private async siteImage(url: string): Promise<string | null> {
    const origin = new URL(url).origin;
    if (!this.siteImageCache.has(origin)) {
      try {
        const fetched = await this.http.fetch(`${origin}/`, { maxBytes: 5 * 1024 * 1024, accept: 'text/html' });
        this.siteImageCache.set(origin, extractHtml(fetched.body.toString('utf8'), fetched.finalUrl).ogImage);
      } catch {
        this.siteImageCache.set(origin, null);
      }
    }
    return this.siteImageCache.get(origin) ?? null;
  }

  /** Ruční úprava produktu správcem. */
  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.getOrFail(id);
    if (dto.name !== undefined) product.name = dto.name;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.material !== undefined) product.material = dto.material;
    if (dto.imageUrl !== undefined) {
      product.imageUrl = dto.imageUrl;
      product.imageSourceUrl = dto.imageUrl ? 'Doplněno ručně správcem' : null;
    }
    if (dto.showInLesson !== undefined) product.showInLesson = dto.showInLesson;
    return this.products.save(product);
  }

  /** Správce potvrdí jednoho z kandidátů párování – teprve pak se použije jeho fotografie. */
  async confirmCandidate(id: string, index: number): Promise<Product> {
    const product = await this.getOrFail(id);
    const candidate = product.candidates?.[index];
    if (!candidate) throw new BadRequestException('Kandidát s tímto indexem neexistuje.');
    Object.assign(product, {
      name: candidate.name,
      sku: candidate.sku ?? product.inputSku,
      productUrl: candidate.url,
      imageUrl: candidate.imageUrl,
      imageSourceUrl: candidate.imageUrl ? candidate.url ?? candidate.location : null,
      location: candidate.location,
      matchStatus: 'confirmed',
      showInLesson: true,
    });
    return this.products.save(product);
  }

  /** Stáhne stránku produktu a vytěží název, SKU, obrázek a popis (JSON-LD / Open Graph). */
  private async fetchProductPage(url: string): Promise<{ name: string; url: string; sku: string | null; imageUrl: string | null; description: string | null; material: string | null } | null> {
    try {
      // I jednotlivé stránky produktů respektují robots.txt webu.
      if (!(await this.crawler.robotsAllows(url))) {
        this.logger.warn(`robots.txt nepovoluje načíst ${url}`);
        return null;
      }
      await sleep(this.config.importRequestDelayMs);
      const fetched = await this.http.fetch(url, { maxBytes: 5 * 1024 * 1024, accept: 'text/html' });
      const page = extractHtml(fetched.body.toString('utf8'), fetched.finalUrl);
      const primary = page.products.find((p) => p.origin !== 'link');
      // Název bez přípony webu („SeaTowel | Hypon“ → „SeaTowel“).
      const rawName = primary?.name ?? page.ogTitle ?? page.title;
      const name = rawName.split(/\s[|–]\s/)[0]?.trim() || rawName;
      if (!name) return null;
      // Obrázek ze strukturovaných dat produktu je spolehlivý; og:image jen pokud není obecným obrázkem celého webu.
      const ogImage = page.ogImage && page.ogImage !== (await this.siteImage(fetched.finalUrl)) ? page.ogImage : null;
      return {
        name: truncate(name, 300),
        url: fetched.finalUrl,
        sku: primary?.sku ?? null,
        imageUrl: primary?.imageUrl ?? ogImage,
        description: primary?.description ?? page.metaDescription,
        material: primary?.material ?? null,
      };
    } catch (error) {
      this.logger.warn(`Produktovou stránku ${url} se nepodařilo načíst: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
