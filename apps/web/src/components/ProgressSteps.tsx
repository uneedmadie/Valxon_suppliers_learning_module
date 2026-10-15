/**
 * Progres studia jednoho dodavatele: „3/7 · 43 %“ a sedm malých kroků.
 * Krok se vyplní až po odeslání odpovědi na otázku kapitoly (pravidlo B).
 */
import type { Progress } from '@/api/types';

export function formatProgress(progress: Progress): string {
  return `${progress.completed}/${progress.total} · ${progress.percent} %`;
}

export function ProgressSteps({ progress, compact = false }: { progress: Progress; compact?: boolean }) {
  return (
    <div aria-label={`Dokončeno ${formatProgress(progress)}`}>
      {!compact && <div className="text-[30px] leading-tight font-extrabold text-dark">{formatProgress(progress)}</div>}
      <ol className="mt-2 flex gap-1" aria-hidden>
        {Array.from({ length: progress.total }, (_, i) => i + 1).map((n) => (
          <li
            key={n}
            className={`h-[7px] flex-1 rounded-full ${progress.completedChapterNumbers.includes(n) ? 'bg-rose' : 'bg-[#e8eaed]'}`}
          />
        ))}
      </ol>
    </div>
  );
}
