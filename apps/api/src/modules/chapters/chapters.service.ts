/**
 * Služba kapitol: založení sedmi kapitol, generování návrhů z faktů, úpravy a schválení.
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FactsService } from '../facts/facts.service';
import { Product } from '../products/entities/product.entity';
import { Question } from '../questions/entities/question.entity';
import { generateQuestion } from '../questions/question-generator';
import { QuestionsService } from '../questions/questions.service';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { buildChapterDraft } from './chapter-draft-builder';
import { CHAPTER_DEFINITIONS } from './chapter-definitions';
import { UpdateChapterDto } from './dto/chapter.dto';
import { Chapter } from './entities/chapter.entity';

/** Správa kapitol dodavatele. */
@Injectable()
export class ChaptersService {
  constructor(
    @InjectRepository(Chapter) private readonly chapters: Repository<Chapter>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly facts: FactsService,
    private readonly questionService: QuestionsService,
  ) {}

  /** Zajistí existenci přesně sedmi kapitol s pevnými názvy (idempotentně). */
  async ensureChapters(supplierId: string): Promise<Chapter[]> {
    const existing = await this.chapters.find({ where: { supplierId } });
    for (const def of CHAPTER_DEFINITIONS) {
      if (existing.some((c) => c.number === def.number)) continue;
      existing.push(await this.chapters.save(this.chapters.create({ supplierId, number: def.number, title: def.title, lead: '', body: '', status: 'draft', isGeneratedDraft: true })));
    }
    return existing.sort((a, b) => a.number - b.number);
  }

  /** Kapitoly dodavatele spolu s jejich otázkami. */
  async listWithQuestions(supplierId: string): Promise<{ chapter: Chapter; question: Question | null }[]> {
    const chapters = await this.chapters.find({ where: { supplierId }, order: { number: 'ASC' } });
    return Promise.all(chapters.map(async (chapter) => ({ chapter, question: await this.questions.findOneBy({ chapterId: chapter.id }) })));
  }

  async getOrFail(id: string): Promise<Chapter> {
    const chapter = await this.chapters.findOneBy({ id });
    if (!chapter) throw new NotFoundException('Kapitola nebyla nalezena.');
    return chapter;
  }

  /**
   * Přegeneruje návrhy textů a otázek z aktuálních (nezamítnutých) faktů.
   * Kapitoly, které správce už upravil nebo schválil, se NEPŘEPISUJÍ.
   * @returns počet přegenerovaných kapitol
   */
  async regenerateDrafts(supplierId: string): Promise<number> {
    const supplier = await this.suppliers.findOneBy({ id: supplierId });
    if (!supplier) throw new NotFoundException('Dodavatel nebyl nalezen.');
    const chapters = await this.ensureChapters(supplierId);
    const facts = await this.facts.listUsable(supplierId);
    const hasBestsellers = (await this.products.countBy({ supplierId, listType: 'bestseller' })) > 0;

    let regenerated = 0;
    for (const chapter of chapters) {
      // Návrh textu jen pro nedotčené automatické koncepty.
      if (chapter.isGeneratedDraft && chapter.status === 'draft') {
        const draft = buildChapterDraft(chapter.number, supplier.name, facts, hasBestsellers);
        Object.assign(chapter, draft);
        await this.chapters.save(chapter);
        regenerated++;
      }
      // Návrh otázky z faktů; služba sama chrání ruční/schválené otázky.
      const generated = generateQuestion(chapter.number, supplier.name, facts);
      if (generated) await this.questionService.saveGenerated(chapter.id, generated);
    }
    return regenerated;
  }

  /** Úprava textu správcem: kapitola přestává být automatickým konceptem a vrací se ke schválení. */
  async update(id: string, dto: UpdateChapterDto): Promise<Chapter> {
    const chapter = await this.getOrFail(id);
    if (dto.lead !== undefined) chapter.lead = dto.lead.trim();
    if (dto.body !== undefined) chapter.body = dto.body.trim();
    if (dto.highlight !== undefined) chapter.highlight = dto.highlight?.trim() || null;
    chapter.isGeneratedDraft = false;
    chapter.status = 'draft';
    // Verze roste kvůli evidenci změn; dosažený progres studentů se tím nemaže.
    chapter.version += 1;
    return this.chapters.save(chapter);
  }

  /** Schválení kapitoly k publikaci. */
  async approve(id: string): Promise<Chapter> {
    const chapter = await this.getOrFail(id);
    if (!chapter.lead.trim() && !chapter.body.trim()) {
      throw new BadRequestException('Prázdnou kapitolu nelze schválit – doplňte výukový text.');
    }
    chapter.status = 'approved';
    return this.chapters.save(chapter);
  }
}
