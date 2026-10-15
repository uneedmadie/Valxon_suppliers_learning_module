/**
 * DTO kontrolních otázek: ruční zadání/úprava správcem a odpověď pro správce.
 */
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsOptional, IsString, IsUUID, Length, Min, ValidateIf } from 'class-validator';
import type { Question, QuestionStatus } from '../entities/question.entity';

/** Zadání nebo úprava otázky kapitoly. */
export class UpsertQuestionDto {
  @IsString()
  @Length(5, 500)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @Length(1, 200, { each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  correctIndex!: number;

  @IsString()
  @Length(5, 1500)
  explanation!: string;

  /** Fakt dokládající správnou odpověď (doporučeno). */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsUUID('4')
  factId?: string | null;
}

/** Otázka v pohledu správce (včetně správné odpovědi). */
export class AdminQuestionResponseDto {
  id!: string;
  chapterId!: string;
  prompt!: string;
  options!: string[];
  correctIndex!: number;
  explanation!: string;
  factId!: string | null;
  origin!: 'generated' | 'manual';
  status!: QuestionStatus;
  version!: number;

  static from(q: Question): AdminQuestionResponseDto {
    return {
      id: q.id,
      chapterId: q.chapterId,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      factId: q.factId,
      origin: q.origin,
      status: q.status,
      version: q.version,
    };
  }
}
