/**
 * DTO kapitol: úprava textu správcem a odpověď pro review (včetně otázky).
 */
import { IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { AdminQuestionResponseDto } from '../../questions/dto/question.dto';
import type { Question } from '../../questions/entities/question.entity';
import type { Chapter, ChapterStatus } from '../entities/chapter.entity';

/** Úprava textu kapitoly; jakákoli změna vrací kapitolu k novému schválení. */
export class UpdateChapterDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  lead?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20000)
  body?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  @MaxLength(1000)
  highlight?: string | null;
}

/** Kapitola v pohledu správce. */
export class AdminChapterResponseDto {
  id!: string;
  number!: number;
  title!: string;
  lead!: string;
  body!: string;
  highlight!: string | null;
  status!: ChapterStatus;
  isGeneratedDraft!: boolean;
  version!: number;
  updatedAt!: string;
  question!: AdminQuestionResponseDto | null;

  static from(chapter: Chapter, question: Question | null): AdminChapterResponseDto {
    return {
      id: chapter.id,
      number: chapter.number,
      title: chapter.title,
      lead: chapter.lead,
      body: chapter.body,
      highlight: chapter.highlight,
      status: chapter.status,
      isGeneratedDraft: chapter.isGeneratedDraft,
      version: chapter.version,
      updatedAt: chapter.updatedAt.toISOString(),
      question: question ? AdminQuestionResponseDto.from(question) : null,
    };
  }
}
