/**
 * Testy kontrolní otázky: bez schválené otázky nelze kapitolu dokončit,
 * odeslat lze až po výběru, po odpovědi se zobrazí vysvětlení.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { LearnChapter } from '@/api/types';
import { formatProgress } from '@/components/ProgressSteps';
import { QuizBox } from './QuizBox';

const chapter = (overrides: Partial<LearnChapter> = {}): LearnChapter => ({
  id: 'c1', number: 1, title: 'Seznam se', lead: '', body: '', highlight: null, facts: [], sources: [], products: [], productListType: null,
  question: { id: 'q1', prompt: 'Kde sídlí dodavatel?', options: ['Česko', 'Nizozemsko'], version: 1 },
  answer: null,
  ...overrides,
});

afterEach(cleanup);

describe('QuizBox', () => {
  it('bez otázky ukáže „Chybí kontrolní otázka“', () => {
    render(<QuizBox chapter={chapter({ question: null })} onAnswered={() => undefined} />);
    expect(screen.getByText('Chybí kontrolní otázka')).toBeTruthy();
  });

  it('odeslání je možné až po výběru odpovědi', () => {
    render(<QuizBox chapter={chapter()} onAnswered={() => undefined} />);
    const submit = screen.getByRole('button', { name: 'Odeslat odpověď' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: /Nizozemsko/ }));
    expect(submit.disabled).toBe(false);
  });

  it('po nesprávné odpovědi ukáže vysvětlení a že je kapitola dokončená', () => {
    render(
      <QuizBox
        chapter={chapter({ answer: { selectedIndex: 0, isCorrect: false, correctIndex: 1, explanation: 'Sídlo je v Nizozemsku.', attempts: 1, maxAttempts: 3, answeredAt: '' } })}
        onAnswered={() => undefined}
      />,
    );
    expect(screen.getByText(/kapitola je přesto dokončená/)).toBeTruthy();
    expect(screen.getByText('Sídlo je v Nizozemsku.')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Zkusit znovu/ })).toBeTruthy();
  });

  it('formát progresu odpovídá zadání „3/7 · 43 %“', () => {
    expect(formatProgress({ completed: 3, total: 7, percent: 43, completedChapterNumbers: [1, 2, 3] })).toBe('3/7 · 43 %');
  });
});
