'use client';
/**
 * Rozvržení výukové kapitoly ve stylu W3Schools/editorial: vlevo pevná navigace
 * sedmi kapitol, uprostřed široká prezentační plocha, vpravo progres a zdroje.
 * Používá ho studentská stránka i náhled správce.
 */
import Link from 'next/link';
import type { LearnChapter, LearnSupplier, SubmitAnswerResponse } from '@/api/types';
import { Markup } from '@/components/Markup';
import { formatProgress, ProgressSteps } from '@/components/ProgressSteps';
import { BusinessVisual, IntroHero, OfferVisual, ProductsVisual, RecapVisual, RemainingFacts, StoryVisual, TechniquesVisual } from './ChapterVisuals';
import { QuizBox } from './QuizBox';

interface ChapterViewProps {
  supplier: LearnSupplier;
  chapterNumber: number;
  /** Základ URL kapitol (student `/learn/slug`, náhled `/admin/suppliers/id/preview`). */
  basePath: string;
  onAnswered: (chapterId: string, response: SubmitAnswerResponse) => void;
}

/** Vizuál specifický pro kapitolu. */
function ChapterVisual({ supplier, chapter }: { supplier: LearnSupplier; chapter: LearnChapter }) {
  switch (chapter.number) {
    case 1:
      return <IntroHero supplier={supplier} />;
    case 2:
      return <StoryVisual chapter={chapter} />;
    case 3:
      return <OfferVisual chapter={chapter} />;
    case 4:
      return <ProductsVisual chapter={chapter} />;
    case 5:
      return <TechniquesVisual chapter={chapter} />;
    case 6:
      return <BusinessVisual chapter={chapter} />;
    default:
      return null;
  }
}

export function ChapterView({ supplier, chapterNumber, basePath, onAnswered }: ChapterViewProps) {
  const chapter = supplier.chapters.find((c) => c.number === chapterNumber) ?? supplier.chapters[0];
  if (!chapter) return null;
  const prev = supplier.chapters.find((c) => c.number === chapter.number - 1);
  const next = supplier.chapters.find((c) => c.number === chapter.number + 1);
  const done = new Set(supplier.progress.completedChapterNumbers);

  return (
    <div className="grid min-h-[calc(100vh-66px)] lg:grid-cols-[254px_minmax(0,1fr)] xl:grid-cols-[254px_minmax(0,1fr)_242px]">
      {/* Navigace kapitol */}
      <aside className="border-r border-line bg-[#f7f7f9] px-3 py-3 lg:sticky lg:top-[66px] lg:h-[calc(100vh-66px)] lg:overflow-y-auto lg:px-4 lg:py-6">
        <Link href="/" className="mx-3 hidden text-[11px] font-bold text-muted hover:text-rose lg:block">← Všichni dodavatelé</Link>
        <p className="mx-3 mt-5 mb-1 hidden text-[10px] font-extrabold tracking-[1.5px] text-[#9b9da5] uppercase lg:block">Dodavatel</p>
        <p className="mx-3 mb-5 hidden text-[18px] font-extrabold text-dark lg:block">{supplier.name}</p>
        <nav aria-label="Kapitoly">
          <ol className="flex gap-0.5 overflow-x-auto lg:flex-col">
            {supplier.chapters.map((c) => {
              const active = c.number === chapter.number;
              return (
                <li key={c.id} className="shrink-0">
                  <Link
                    href={`${basePath}/${c.number}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-3 border-b-[3px] px-3 py-2.5 text-[12px] lg:border-b-0 lg:border-l-[3px] ${active ? 'border-rose bg-rose-pale font-bold text-[#ad222b]' : 'border-transparent font-medium text-[#50555e] hover:bg-white'}`}
                  >
                    <span className={`min-w-[18px] text-[10px] ${active ? 'text-[#b5222e]' : 'text-[#a9abb3]'}`}>{String(c.number).padStart(2, '0')}</span>
                    <span className="whitespace-nowrap lg:whitespace-normal">{c.title}</span>
                    {done.has(c.number) && <span className="ml-auto text-[13px] text-green" aria-label="dokončeno">✓</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
        <div className="mx-3 mt-6 hidden border-t border-line pt-5 lg:block xl:hidden">
          <p className="mb-1 text-[12px] font-extrabold text-dark">Tvůj postup</p>
          <ProgressSteps progress={supplier.progress} />
        </div>
      </aside>

      {/* Prezentační plocha kapitoly */}
      <main className="min-w-0">
        <article className="mx-auto max-w-[930px] px-5 pt-7 pb-24 md:px-12">
          {supplier.preview && (
            <div className="mb-6 rounded border border-amber/40 bg-amber-soft px-4 py-2 text-[12px] text-amber">
              Náhled správce – takto uvidí kapitolu student. Neschválené texty a neověřená fakta se nezobrazují.
            </div>
          )}
          <p className="mb-6 text-[11px] text-[#91959e]">
            Učebnice / {supplier.name} / <b className="text-rose-dark">{chapter.title}</b>
          </p>
          <p className="kicker">Kapitola {String(chapter.number).padStart(2, '0')} z 07</p>
          <h1 className="mt-3 mb-4 text-[32px] leading-[1.16] font-extrabold tracking-[-1.5px] text-dark md:text-[42px]">{chapter.title}</h1>
          {chapter.lead && <p className="mb-6 max-w-[760px] text-[17px] leading-[1.75] text-[#555b65]">{chapter.lead}</p>}

          <ChapterVisual supplier={supplier} chapter={chapter} />
          <Markup source={chapter.body} />

          {chapter.highlight && (
            <aside className="my-7 border-l-4 border-rose bg-[#fff4f3] px-5 py-4 text-[14px] leading-relaxed text-[#3d4046]">
              <b className="mb-1 block text-[#b92b32]">Věděli jste, že…?</b>
              {chapter.highlight}
            </aside>
          )}

          <RemainingFacts chapter={chapter} />
          {chapter.number === 7 && <RecapVisual />}

          {!chapter.lead && !chapter.body && chapter.facts.length === 0 && chapter.number !== 4 && (
            <p className="my-6 text-[14px] text-muted">Obsah této kapitoly zatím nebyl schválen.</p>
          )}

          <QuizBox
            key={`${chapter.id}-${chapter.answer?.attempts ?? 0}`}
            chapter={chapter}
            disabled={supplier.preview}
            onAnswered={(response) => onAnswered(chapter.id, response)}
          />

          <footer className="mt-10 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-6">
            {prev ? <Link href={`${basePath}/${prev.number}`} className="btn btn-secondary">← {prev.title}</Link> : <span />}
            {next && <Link href={`${basePath}/${next.number}`} className="btn btn-dark">{next.title} →</Link>}
          </footer>
        </article>
      </main>

      {/* Pravý panel: progres a zdroje */}
      <aside className="hidden border-l border-line px-5 py-7 xl:sticky xl:top-[66px] xl:block xl:h-[calc(100vh-66px)] xl:overflow-y-auto">
        <p className="mb-3 text-[12px] font-extrabold text-dark">Tvůj postup</p>
        <ProgressSteps progress={supplier.progress} />
        <p className="mt-3 text-[11px] leading-relaxed text-[#808792]">
          Kapitola se dokončí odesláním kontrolní otázky. {supplier.progress.completed === 7 ? 'Máš hotovo všech 7 kapitol.' : `Hotovo ${formatProgress(supplier.progress)}.`}
        </p>
        {chapter.sources.length > 0 && (
          <>
            <div className="my-6 border-t border-line" />
            <p className="mb-2 text-[12px] font-extrabold text-dark">Zdroje kapitoly</p>
            <ul className="space-y-2">
              {chapter.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="block text-[12px] break-words text-[#676d76] hover:text-rose">{s.title} ↗</a>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
