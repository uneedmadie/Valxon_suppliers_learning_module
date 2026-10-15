/**
 * Služba dodavatelů: založení profilu (vč. URL zdroje, bestsellerů a 7 prázdných kapitol),
 * úpravy, kontrola připravenosti a publikace.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { slugify } from '../../common/text';
import { CHAPTER_COUNT } from '../chapters/chapter-definitions';
import { ChaptersService } from '../chapters/chapters.service';
import { Chapter } from '../chapters/entities/chapter.entity';
import { ProductsService } from '../products/products.service';
import { Question } from '../questions/entities/question.entity';
import { SourcesService } from '../sources/sources.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PublishCheck } from './dto/supplier-response.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';

/** Správa profilů dodavatelů. */
@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(Chapter) private readonly chapters: Repository<Chapter>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    private readonly sources: SourcesService,
    private readonly products: ProductsService,
    private readonly chapterService: ChaptersService,
  ) {}

  list(): Promise<Supplier[]> {
    return this.suppliers.find({ order: { createdAt: 'DESC' } });
  }

  async getOrFail(id: string): Promise<Supplier> {
    const supplier = await this.suppliers.findOneBy({ id });
    if (!supplier) throw new NotFoundException('Dodavatel nebyl nalezen.');
    return supplier;
  }

  /**
   * Založí dodavatele. Žádný obsah se zde nevymýšlí: vznikne prázdný profil,
   * kořenový URL zdroj, seznam bestsellerů od správce a sedm prázdných kapitol k importu.
   */
  async create(dto: CreateSupplierDto): Promise<Supplier> {
    const supplier = await this.suppliers.save(
      this.suppliers.create({
        name: dto.name.trim(),
        slug: await this.uniqueSlug(dto.name),
        websiteUrl: dto.websiteUrl ?? null,
        adminNotes: dto.adminNotes ?? null,
        status: 'draft',
      }),
    );
    if (dto.websiteUrl) await this.sources.addUrl(supplier.id, dto.websiteUrl, 'official');
    if (dto.bestsellers?.length) await this.products.replaceBestsellers(supplier.id, dto.bestsellers);
    await this.chapterService.ensureChapters(supplier.id);
    return supplier;
  }

  /** Úprava profilu; při změně webu se přidá nový kořenový URL zdroj. */
  async update(id: string, dto: UpdateSupplierDto): Promise<Supplier> {
    const supplier = await this.getOrFail(id);
    if (dto.name !== undefined) supplier.name = dto.name.trim();
    if (dto.tagline !== undefined) supplier.tagline = dto.tagline?.trim() || null;
    if (dto.hqCity !== undefined) supplier.hqCity = dto.hqCity?.trim() || null;
    if (dto.hqCountryCode !== undefined) supplier.hqCountryCode = dto.hqCountryCode;
    if (dto.supplierType !== undefined) supplier.supplierType = dto.supplierType;
    if (dto.adminNotes !== undefined) supplier.adminNotes = dto.adminNotes;
    if (dto.websiteUrl !== undefined && dto.websiteUrl !== supplier.websiteUrl) {
      supplier.websiteUrl = dto.websiteUrl;
      if (dto.websiteUrl) await this.sources.addUrl(supplier.id, dto.websiteUrl, 'official');
    }
    return this.suppliers.save(supplier);
  }

  /**
   * Kontrola připravenosti k publikaci. Pravidla vycházejí ze specifikace:
   * všech 7 kapitol schválených a každá má schválenou otázku s doloženou odpovědí
   * (student nesmí dostat „falešně dokončitelnou“ kapitolu).
   */
  async publishCheck(id: string): Promise<PublishCheck> {
    await this.getOrFail(id);
    const chapters = await this.chapters.find({ where: { supplierId: id }, order: { number: 'ASC' } });
    const problems: string[] = [];
    if (chapters.length !== CHAPTER_COUNT) problems.push(`Dodavatel má ${chapters.length} kapitol místo ${CHAPTER_COUNT}.`);

    for (const chapter of chapters) {
      const label = `Kapitola ${chapter.number} „${chapter.title}“`;
      if (chapter.status !== 'approved') problems.push(`${label}: text není schválený.`);
      if (!chapter.lead.trim() && !chapter.body.trim()) problems.push(`${label}: chybí výukový text.`);
      const question = await this.questions.findOneBy({ chapterId: chapter.id });
      if (!question) problems.push(`${label}: chybí kontrolní otázka.`);
      else if (question.status !== 'approved') problems.push(`${label}: kontrolní otázka není schválená.`);
    }
    return { ready: problems.length === 0, problems };
  }

  /**
   * Publikuje dodavatele. Při nesplnění kontrol vrátí 400 se seznamem problémů –
   * nic neověřeného se tak nedostane ke studentům.
   */
  async publish(id: string): Promise<Supplier> {
    const check = await this.publishCheck(id);
    if (!check.ready) throw new BadRequestException({ message: 'Dodavatele zatím nelze publikovat.', problems: check.problems });
    const supplier = await this.getOrFail(id);
    supplier.status = 'published';
    supplier.publishedAt = new Date();
    supplier.contentVersion += 1;
    return this.suppliers.save(supplier);
  }

  /** Stáhne publikaci (obsah zůstane uložený, progres studentů se nemaže). */
  async unpublish(id: string): Promise<Supplier> {
    const supplier = await this.getOrFail(id);
    supplier.status = 'review';
    return this.suppliers.save(supplier);
  }

  /** Vytvoří unikátní slug (přidá číselnou příponu při kolizi). */
  private async uniqueSlug(name: string): Promise<string> {
    const base = slugify(name);
    let candidate = base;
    for (let i = 2; await this.suppliers.existsBy({ slug: candidate }); i++) candidate = `${base}-${i}`;
    return candidate;
  }
}
