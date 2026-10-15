/**
 * Služba kontrolních otázek: ukládání návrhů, ruční úpravy a schvalování.
 * Schválit lze jen otázku, jejíž správná odpověď je doložená ověřeným faktem
 * (nebo ji ručně napsal správce, který za ni odpovídá).
 */
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Fact } from '../facts/entities/fact.entity';
import { UpsertQuestionDto } from './dto/question.dto';
import { Question } from './entities/question.entity';
import type { GeneratedQuestion } from './question-generator';

/** Správa kontrolních otázek kapitol. */
@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Chapter) private readonly chapters: Repository<Chapter>,
    @InjectRepository(Fact) private readonly facts: Repository<Fact>,
  ) {}

  findByChapter(chapterId: string): Promise<Question | null> {
    return this.questions.findOneBy({ chapterId });
  }

  /**
   * Uloží vygenerovaný návrh. Ruční nebo již schválenou otázku nikdy nepřepíše –
   * práce správce má přednost před automatikou.
   */
  async saveGenerated(chapterId: string, generated: GeneratedQuestion): Promise<void> {
    const existing = await this.findByChapter(chapterId);
    if (existing && (existing.origin === 'manual' || existing.status === 'approved')) return;
    const question = existing ?? this.questions.create({ chapterId, version: 0 });
    Object.assign(question, { ...generated, origin: 'generated', status: 'draft', version: question.version + 1 });
    await this.questions.save(question);
  }

  /** Ruční zadání/úprava otázky; vrací ji do stavu `draft` k novému schválení. */
  async upsert(chapterId: string, dto: UpsertQuestionDto): Promise<Question> {
    const chapter = await this.chapterOrFail(chapterId);
    this.validateOptions(dto.options, dto.correctIndex);
    if (dto.factId) await this.factOfSupplierOrFail(dto.factId, chapter.supplierId);

    const existing = await this.findByChapter(chapterId);
    const question = existing ?? this.questions.create({ chapterId, version: 0 });
    Object.assign(question, {
      prompt: dto.prompt.trim(),
      options: dto.options.map((o) => o.trim()),
      correctIndex: dto.correctIndex,
      explanation: dto.explanation.trim(),
      factId: dto.factId ?? null,
      origin: 'manual',
      status: 'draft',
      version: question.version + 1,
    });
    return this.questions.save(question);
  }

  /**
   * Schválí otázku kapitoly.
   * @throws BadRequestException pokud otázka chybí nebo se opírá o neověřený fakt.
   */
  async approve(chapterId: string): Promise<Question> {
    const chapter = await this.chapterOrFail(chapterId);
    const question = await this.findByChapter(chapterId);
    if (!question) throw new BadRequestException('Chybí kontrolní otázka – nejprve ji doplňte.');
    this.validateOptions(question.options, question.correctIndex);

    // Doložená správná odpověď: fakt musí být ověřený správcem.
    if (question.factId) {
      const fact = await this.factOfSupplierOrFail(question.factId, chapter.supplierId);
      if (fact.status !== 'verified') {
        throw new BadRequestException(`Správná odpověď se opírá o neověřený fakt „${fact.label}: ${fact.value}“. Nejprve fakt ověřte.`);
      }
    } else if (question.origin === 'generated') {
      throw new BadRequestException('Vygenerovaná otázka nemá doložený fakt – upravte ji ručně.');
    }
    question.status = 'approved';
    return this.questions.save(question);
  }

  private validateOptions(options: string[], correctIndex: number): void {
    if (correctIndex < 0 || correctIndex >= options.length) throw new BadRequestException('Index správné odpovědi je mimo rozsah možností.');
    const normalized = options.map((o) => o.trim().toLowerCase());
    if (normalized.some((o) => !o)) throw new BadRequestException('Možnosti odpovědí nesmí být prázdné.');
    if (new Set(normalized).size !== normalized.length) throw new BadRequestException('Možnosti odpovědí se nesmí opakovat.');
  }

  private async chapterOrFail(chapterId: string): Promise<Chapter> {
    const chapter = await this.chapters.findOneBy({ id: chapterId });
    if (!chapter) throw new NotFoundException('Kapitola nebyla nalezena.');
    return chapter;
  }

  private async factOfSupplierOrFail(factId: string, supplierId: string): Promise<Fact> {
    const fact = await this.facts.findOneBy({ id: factId });
    if (!fact || fact.supplierId !== supplierId) throw new BadRequestException('Doložený fakt nepatří tomuto dodavateli.');
    return fact;
  }
}
