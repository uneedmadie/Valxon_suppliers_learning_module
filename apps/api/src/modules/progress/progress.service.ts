/**
 * Služba progresu – implementace schváleného pravidla B:
 * kapitola je dokončená až po ODESLÁNÍ odpovědi na její kontrolní otázku, i když je
 * odpověď nesprávná. Otevření kapitoly ani scrollování progres nemění. Odpověď se ukládá
 * idempotentně (unikátní uživatel + kapitola), takže refresh nevytváří duplicity.
 */
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { CHAPTER_COUNT } from '../chapters/chapter-definitions';
import { Chapter } from '../chapters/entities/chapter.entity';
import { Question } from '../questions/entities/question.entity';
import { Supplier } from '../suppliers/entities/supplier.entity';
import { AnswerResultDto, ProgressDto, SubmitAnswerDto, SubmitAnswerResponseDto } from './dto/progress.dto';
import { ChapterAnswer } from './entities/chapter-answer.entity';

/** Maximální počet odeslání jedné otázky – možnost opravy bez nekonečného hádání. */
export const MAX_ATTEMPTS = 3;

/** Evidence odpovědí a výpočet progresu. */
@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(ChapterAnswer) private readonly answers: Repository<ChapterAnswer>,
    @InjectRepository(Chapter) private readonly chapters: Repository<Chapter>,
    @InjectRepository(Question) private readonly questions: Repository<Question>,
    @InjectRepository(Supplier) private readonly suppliers: Repository<Supplier>,
  ) {}

  /** Progres = počet kapitol s uloženou odpovědí / 7. */
  async progressFor(userId: string, supplierId: string): Promise<ProgressDto> {
    const chapterIds = (await this.chapters.find({ where: { supplierId }, select: { id: true } })).map((c) => c.id);
    const answers = chapterIds.length ? await this.answers.find({ where: { userId, chapterId: In(chapterIds) } }) : [];
    const numbers = [...new Set(answers.map((a) => a.chapterNumber))].sort((a, b) => a - b);
    return {
      completed: numbers.length,
      total: CHAPTER_COUNT,
      percent: Math.round((numbers.length / CHAPTER_COUNT) * 100),
      completedChapterNumbers: numbers,
    };
  }

  /** Uložené odpovědi uživatele u dodavatele (pro obnovení stavu po reloadu). */
  answersFor(userId: string, supplierId: string): Promise<ChapterAnswer[]> {
    return this.answers.find({ where: { userId, supplierId } });
  }

  /**
   * Zpracuje odeslání odpovědi.
   * @throws NotFoundException kapitola/dodavatel neexistuje nebo není publikován
   * @throws BadRequestException kapitola nemá schválenou otázku / neplatná volba
   * @throws ConflictException otázka se mezitím změnila nebo vyčerpány pokusy
   */
  async submit(userId: string, chapterId: string, dto: SubmitAnswerDto): Promise<SubmitAnswerResponseDto> {
    const chapter = await this.chapters.findOneBy({ id: chapterId });
    if (!chapter) throw new NotFoundException('Kapitola nebyla nalezena.');
    const supplier = await this.suppliers.findOneBy({ id: chapter.supplierId });
    if (!supplier || supplier.status !== 'published') throw new NotFoundException('Dodavatel není publikován.');

    // Bez schválené otázky nelze kapitolu dokončit – nesmí vzniknout „falešné“ dokončení.
    const question = await this.questions.findOneBy({ chapterId });
    if (!question || question.status !== 'approved') throw new BadRequestException('Kapitola nemá schválenou kontrolní otázku.');
    if (question.id !== dto.questionId) throw new ConflictException('Otázka se mezitím změnila – obnovte stránku.');
    if (dto.selectedIndex >= question.options.length) throw new BadRequestException('Zvolená odpověď neexistuje.');

    const isCorrect = dto.selectedIndex === question.correctIndex;
    let answer = await this.answers.findOneBy({ userId, chapterId });
    if (answer) {
      // Opakovaný pokus: kapitola zůstává dokončená, ukládá se poslední odpověď.
      if (answer.attempts >= MAX_ATTEMPTS) throw new ConflictException(`Otázku lze odeslat nejvýše ${MAX_ATTEMPTS}×.`);
      Object.assign(answer, { questionId: question.id, questionVersion: question.version, selectedIndex: dto.selectedIndex, isCorrect, attempts: answer.attempts + 1 });
    } else {
      answer = this.answers.create({
        userId,
        supplierId: supplier.id,
        chapterId,
        chapterNumber: chapter.number,
        questionId: question.id,
        questionVersion: question.version,
        selectedIndex: dto.selectedIndex,
        isCorrect,
        attempts: 1,
      });
    }
    answer = await this.answers.save(answer);

    return {
      answer: this.toResult(answer, question),
      progress: await this.progressFor(userId, supplier.id),
    };
  }

  /** Sestaví výsledek odpovědi – správná odpověď se odhaluje až po odeslání. */
  toResult(answer: ChapterAnswer, question: Question): AnswerResultDto {
    return {
      selectedIndex: answer.selectedIndex,
      isCorrect: answer.isCorrect,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
      attempts: answer.attempts,
      maxAttempts: MAX_ATTEMPTS,
      answeredAt: answer.updatedAt.toISOString(),
    };
  }
}
