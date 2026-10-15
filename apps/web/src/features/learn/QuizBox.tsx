'use client';
/**
 * Kontrolní otázka na konci kapitoly. Pravidlo B: kapitola se dokončí až ODESLÁNÍM
 * odpovědi – i nesprávné. Po odeslání se zobrazí vysvětlení; opravu lze zkusit
 * omezeně (server hlídá počet pokusů), takže nevzniká nekonečné hádání.
 */
import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { LearnChapter, SubmitAnswerResponse } from '@/api/types';

interface QuizBoxProps {
  chapter: LearnChapter;
  /** V náhledu správce se odpovědi neukládají (obsah není publikovaný). */
  disabled?: boolean;
  onAnswered: (response: SubmitAnswerResponse) => void;
}

export function QuizBox({ chapter, disabled = false, onAnswered }: QuizBoxProps) {
  const question = chapter.question;
  const [selected, setSelected] = useState<number | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!question) {
    return (
      <div className="my-8 border-l-[3px] border-[#a7acb5] bg-pale px-5 py-4 text-[13px] text-[#68707b]">
        <b className="block text-dark">Chybí kontrolní otázka</b>
        Kapitolu zatím nelze dokončit – otázku musí doplnit a schválit správce.
      </div>
    );
  }

  const answer = retrying ? null : chapter.answer;

  /** Odeslání odpovědi na server – jediná akce, která mění progres. */
  const submit = async (): Promise<void> => {
    if (selected === null) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await api<SubmitAnswerResponse>(`/learn/chapters/${chapter.id}/answer`, {
        method: 'POST',
        body: { questionId: question.id, selectedIndex: selected },
      });
      setRetrying(false);
      onAnswered(response);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Odpověď se nepodařilo odeslat.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="my-10 rounded-lg border border-[#e9d6d7] bg-[#fffbfb] px-6 py-6 md:px-7" aria-labelledby={`quiz-${chapter.id}`}>
      <p className="text-[10px] font-extrabold tracking-[1.4px] text-rose-dark uppercase">Kontrolní otázka · dokončí kapitolu</p>
      <h3 id={`quiz-${chapter.id}`} className="mt-2 mb-4 text-[17px] leading-snug font-bold text-dark">{question.prompt}</h3>

      <div role="radiogroup" aria-label="Možnosti odpovědi">
        {question.options.map((option, i) => {
          const isSelected = answer ? answer.selectedIndex === i : selected === i;
          const isCorrect = answer?.correctIndex === i;
          let style = 'border-[#e3e5e8] bg-white hover:border-rose';
          if (answer && isCorrect) style = 'border-green bg-fresh';
          else if (answer && isSelected) style = 'border-rose bg-rose-soft';
          else if (isSelected) style = 'border-rose bg-[#fff0f0]';
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={Boolean(answer) || disabled}
              onClick={() => setSelected(i)}
              className={`my-2 flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-[14px] transition-colors disabled:cursor-default ${style}`}
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-[11px] font-bold text-muted">{String.fromCharCode(65 + i)}</span>
              <span className="text-dark">{option}</span>
              {answer && isCorrect && <span className="ml-auto text-[11px] font-bold text-green">správná odpověď</span>}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-3 text-[13px] text-rose-dark" role="alert">{error}</p>}

      {answer ? (
        <div className={`mt-4 border-l-[3px] px-4 py-3 text-[13px] leading-relaxed ${answer.isCorrect ? 'border-[#1e9965] bg-[#eef9f2]' : 'border-[#9da7b0] bg-[#f1f3f5]'}`} role="status">
          <b className="mb-1 block text-dark">{answer.isCorrect ? 'Správně! Kapitola je dokončená.' : 'Tentokrát ne – kapitola je přesto dokončená.'}</b>
          {answer.explanation}
          {!answer.isCorrect && answer.attempts < answer.maxAttempts && !disabled && (
            <button type="button" className="btn btn-small btn-secondary mt-3 block" onClick={() => { setRetrying(true); setSelected(null); }}>
              Zkusit znovu ({answer.maxAttempts - answer.attempts}×)
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="btn" disabled={selected === null || submitting || disabled} onClick={() => void submit()}>
            {submitting ? 'Odesílám…' : 'Odeslat odpověď'}
          </button>
          <span className="text-[12px] text-muted">
            {disabled ? 'V náhledu správce se odpovědi neukládají.' : 'Kapitola se započítá až po odeslání odpovědi.'}
          </span>
        </div>
      )}
    </section>
  );
}
