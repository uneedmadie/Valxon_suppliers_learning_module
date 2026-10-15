/**
 * DTO progresu: odeslání odpovědi a odpověď s vysvětlením a stavem studia.
 */
import { IsInt, IsUUID, Max, Min } from 'class-validator';

/** Odeslání odpovědi na kontrolní otázku kapitoly. */
export class SubmitAnswerDto {
  /** ID otázky, kterou student viděl – brání započtení odpovědi na mezitím změněnou otázku. */
  @IsUUID('4')
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(9)
  selectedIndex!: number;
}

/** Progres studenta u jednoho dodavatele (počet dokončených kapitol / 7). */
export class ProgressDto {
  completed!: number;
  total!: number;
  percent!: number;
  completedChapterNumbers!: number[];
}

/** Uložená odpověď studenta včetně vysvětlení. */
export class AnswerResultDto {
  selectedIndex!: number;
  isCorrect!: boolean;
  correctIndex!: number;
  explanation!: string;
  attempts!: number;
  maxAttempts!: number;
  answeredAt!: string;
}

/** Výsledek odeslání odpovědi. */
export class SubmitAnswerResponseDto {
  answer!: AnswerResultDto;
  progress!: ProgressDto;
}
