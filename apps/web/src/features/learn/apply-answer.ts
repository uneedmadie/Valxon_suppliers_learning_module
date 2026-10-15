/**
 * Aplikace výsledku odeslané odpovědi na lokální stav dodavatele
 * (aktualizuje odpověď kapitoly i progres bez nového načtení stránky).
 */
import type { LearnSupplier, SubmitAnswerResponse } from '@/api/types';

export function applyAnswer(supplier: LearnSupplier, chapterId: string, response: SubmitAnswerResponse): LearnSupplier {
  return {
    ...supplier,
    progress: response.progress,
    chapters: supplier.chapters.map((c) => (c.id === chapterId ? { ...c, answer: response.answer } : c)),
  };
}
