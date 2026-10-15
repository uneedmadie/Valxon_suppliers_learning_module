/**
 * Sestavení studentského pohledu na dodavatele. Jediné místo, které rozhoduje,
 * co student uvidí: jen publikovaný profil, schválené kapitoly, ověřená fakta,
 * veřejné webové zdroje a schválené otázky (bez správné odpovědi do odeslání).
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { countryByCode, distanceKm, VALXON_HQ } from '../../common/countries';
import { CHAPTER_DEFINITIONS, REPRESENTATIVE_PRODUCTS_TITLE } from '../chapters/chapter-definitions';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Fact } from '../facts/entities/fact.entity';
import { Product } from '../products/entities/product.entity';
import { ProgressService } from '../progress/progress.service';
import { Question } from '../questions/entities/question.entity';
import { Source } from '../sources/entities/source.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { LearnChapterDto, LearnLocationDto, LearnProductDto, LearnSupplierDto, LearnSupplierSummaryDto } from './dto/learning.dto';

/** Druhy faktů, které se v kapitole nevypisují jako text (mají vlastní vizuál). */
const HIDDEN_FACT_KINDS = new Set(['image_hero']);

/** Studentský výukový obsah. */
@Injectable()
export class LearningService {
  constructor(
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(Chapter) private readonly chapters: Repository<Chapter>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Fact) private readonly facts: Repository<Fact>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(Source) private readonly sources: Repository<Source>,
    private readonly progress: ProgressService,
  ) {}

  /** Katalog publikovaných dodavatelů s progresem uživatele. */
  async listPublished(userId: string): Promise<LearnSupplierSummaryDto[]> {
    const published = await this.suppliers.find({ where: { status: 'published' }, order: { name: 'ASC' } });
    return Promise.all(
      published.map(async (s) => ({
        slug: s.slug,
        name: s.name,
        tagline: s.tagline,
        supplierType: s.supplierType,
        countryName: countryByCode(s.hqCountryCode)?.nameCs ?? null,
        heroImageUrl: await this.heroImage(s.id),
        progress: await this.progress.progressFor(userId, s.id),
      })),
    );
  }

  /** Publikovaný profil podle slugu (student). Nepublikovaný = 404, i když existuje. */
  async getPublished(slug: string, userId: string): Promise<LearnSupplierDto> {
    const supplier = await this.suppliers.findOneBy({ slug, status: 'published' });
    if (!supplier) throw new NotFoundException('Dodavatel nebyl nalezen.');
    return this.build(supplier, userId, false);
  }

  /** Náhled pro správce – stejný filtr obsahu jako u studenta, jen bez podmínky publikace. */
  async preview(supplierId: string, userId: string): Promise<LearnSupplierDto> {
    const supplier = await this.suppliers.findOneBy({ id: supplierId });
    if (!supplier) throw new NotFoundException('Dodavatel nebyl nalezen.');
    return this.build(supplier, userId, true);
  }

  private async build(supplier: Supplier, userId: string, preview: boolean): Promise<LearnSupplierDto> {
    const chapters = await this.chapters.find({ where: { supplierId: supplier.id }, order: { number: 'ASC' } });
    const questions = chapters.length ? await this.questions.find({ where: { chapterId: In(chapters.map((c) => c.id)) } }) : [];
    const verified = await this.facts.find({ where: { supplierId: supplier.id, status: 'verified' }, order: { createdAt: 'ASC' } });
    const answers = await this.progress.answersFor(userId, supplier.id);
    const products = await this.lessonProducts(supplier.id);

    // Veřejné zdroje: jen webové stránky (oficiální/externí), na které odkazují ověřená fakta.
    const sourceIds = [...new Set(verified.map((f) => f.sourceId).filter((id): id is string => Boolean(id)))];
    const publicSources = sourceIds.length
      ? (await this.sources.find({ where: { id: In(sourceIds) } })).filter((s) => s.url && s.origin !== 'internal' && (s.kind === 'web' || s.kind === 'web-root' || s.kind === 'pdf'))
      : [];

    const chapterDtos: LearnChapterDto[] = chapters.map((chapter) => {
      // Neschválený text kapitoly student nevidí (v náhledu správce je pravdivě prázdný).
      const approved = chapter.status === 'approved';
      const chapterFacts = verified.filter((f) => f.chapter === chapter.number && !HIDDEN_FACT_KINDS.has(f.kind));
      const question = questions.find((q) => q.chapterId === chapter.id && q.status === 'approved') ?? null;
      const answer = answers.find((a) => a.chapterId === chapter.id);
      const isProducts = chapter.number === 4;
      return {
        id: chapter.id,
        number: chapter.number,
        title: isProducts ? products.title : chapter.title,
        lead: approved ? chapter.lead : '',
        body: approved ? chapter.body : '',
        highlight: approved ? chapter.highlight : null,
        facts: chapterFacts.map((f) => ({ kind: f.kind, label: f.label, value: f.value })),
        sources: publicSources
          .filter((s) => chapterFacts.some((f) => f.sourceId === s.id))
          .map((s) => ({ title: s.title, url: s.url! })),
        products: isProducts ? products.items : [],
        productListType: isProducts ? products.type : null,
        question: question ? { id: question.id, prompt: question.prompt, options: question.options, version: question.version } : null,
        // Odpověď (a tím i správné řešení) se vrací jen pokud ji student už odeslal.
        answer: answer && question ? this.progress.toResult(answer, question) : null,
      };
    });

    return {
      slug: supplier.slug,
      name: supplier.name,
      tagline: supplier.tagline,
      supplierType: supplier.supplierType,
      websiteUrl: supplier.websiteUrl,
      heroImageUrl: await this.heroImage(supplier.id),
      location: this.location(supplier),
      chapters: chapterDtos,
      progress: await this.progress.progressFor(userId, supplier.id),
      preview,
    };
  }

  /**
   * Produkty kapitoly 4. Pokud správce dodal seznam bestsellerů, kapitola je „TOP bestsellery“;
   * jinak „Reprezentativní výběr“ z produktů, které správce ručně zařadil. Fotografie se
   * zobrazí jen u jednoznačně spárovaného/potvrzeného produktu.
   */
  private async lessonProducts(supplierId: string): Promise<{ title: string; type: 'bestsellers' | 'representative'; items: LearnProductDto[] }> {
    const all = await this.products.find({ where: { supplierId }, order: { position: 'ASC' } });
    const bestsellers = all.filter((p) => p.listType === 'bestseller');
    const hasList = bestsellers.length > 0;
    const shown = (hasList ? bestsellers : all.filter((p) => p.listType === 'discovered')).filter((p) => p.showInLesson);
    const def = CHAPTER_DEFINITIONS.find((c) => c.number === 4)!;
    return {
      title: hasList ? (bestsellers.length === 10 ? def.title : `TOP ${bestsellers.length} bestsellerů`) : REPRESENTATIVE_PRODUCTS_TITLE,
      type: hasList ? 'bestsellers' : 'representative',
      items: shown.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        productUrl: p.productUrl,
        imageUrl: p.matchStatus === 'matched' || p.matchStatus === 'confirmed' ? p.imageUrl : null,
        description: p.description,
        material: p.material,
        category: p.category,
      })),
    };
  }

  /** Úvodní fotografie – jen pokud správce ověřil fakt `image_hero` (oprávnění k užití). */
  private async heroImage(supplierId: string): Promise<string | null> {
    const fact = await this.facts.findOne({ where: { supplierId, kind: 'image_hero', status: 'verified' }, order: { updatedAt: 'DESC' } });
    return fact?.value ?? null;
  }

  /** Orientační poloha podle země sídla potvrzené správcem. */
  private location(supplier: Supplier): LearnLocationDto | null {
    const country = countryByCode(supplier.hqCountryCode);
    if (!country) return null;
    return {
      city: supplier.hqCity,
      countryCode: country.code,
      countryName: country.nameCs,
      lat: country.lat,
      lng: country.lng,
      distanceKm: distanceKm(VALXON_HQ, country),
      valxon: { city: VALXON_HQ.city, lat: VALXON_HQ.lat, lng: VALXON_HQ.lng },
    };
  }
}
