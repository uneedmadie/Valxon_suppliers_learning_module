'use client';
/**
 * Úvodní stránka: katalog publikovaných dodavatelů ve stylu editorial přehledu
 * (široké řádky s progresem, žádná mřížka malých karet).
 */
import Link from 'next/link';
import type { LearnSupplierSummary } from '@/api/types';
import { formatProgress, ProgressSteps } from '@/components/ProgressSteps';
import { Empty, ErrorBox, Loading } from '@/components/StateViews';
import { useApi } from '@/hooks/use-api';
import { useSession } from '@/hooks/session';

const TYPE_LABEL: Record<string, string> = {
  specialist: 'Specialista',
  narrow: 'Úzká kategorie',
  generalist: 'Generalista',
  unknown: 'Dodavatel',
};

export default function LibraryPage() {
  const { role } = useSession();
  const { data, error, loading } = useApi<LearnSupplierSummary[]>('/learn/suppliers');

  return (
    <main>
      {/* Hero úvod akademie */}
      <section className="relative overflow-hidden bg-dark text-white">
        <div aria-hidden className="absolute -top-40 -right-16 h-[390px] w-[390px] rounded-full border border-white/10" />
        <div aria-hidden className="absolute -top-24 right-10 h-[280px] w-[280px] rounded-full border border-white/10" />
        <div className="relative mx-auto max-w-[1100px] px-6 py-14 md:px-12 md:py-20">
          <p className="kicker !text-[#ff7a7d]">VALXON Academy</p>
          <h1 className="mt-3 max-w-[720px] text-[34px] leading-[1.15] font-extrabold tracking-[-1.5px] md:text-[46px]">
            Dodavatelská učebnice: <span className="text-[#ff7a7d]">sedm kapitol</span> ke každému partnerovi.
          </h1>
          <p className="mt-5 max-w-[640px] text-[16px] leading-relaxed text-[#d6d8dc]">
            Krátký příběh, nabídka, technologie a obchodní pravidla dodavatele – jen z doložených podkladů.
            Kapitolu dokončíš odesláním krátké kontrolní otázky.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1100px] px-6 py-10 md:px-12">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="micro-label">Publikovaní dodavatelé</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-dark">Vyber dodavatele a začni studovat</h2>
          </div>
          {role === 'admin' && <Link href="/admin" className="btn btn-secondary">Správa obsahu</Link>}
        </div>

        {loading && <Loading />}
        {error && <ErrorBox error={error} />}
        {data && data.length === 0 && (
          <Empty title="Zatím není publikovaný žádný dodavatel.">
            {role === 'admin'
              ? 'Přidej dodavatele, spusť import podkladů, zkontroluj fakta a publikuj.'
              : 'Jakmile správce obsah schválí a publikuje, objeví se zde.'}
          </Empty>
        )}

        <ol className="border-t border-line">
          {data?.map((s, i) => (
            <li key={s.slug} className="grid gap-5 border-b border-line py-7 md:grid-cols-[64px_1fr_260px] md:items-center">
              <span className="text-[34px] leading-none font-extrabold text-rose">{String(i + 1).padStart(2, '0')}</span>
              <div className="flex items-center gap-5">
                {s.heroImageUrl && (
                  <img src={s.heroImageUrl} alt="" className="hidden h-[72px] w-[108px] rounded-md object-cover sm:block" />
                )}
                <div>
                  <Link href={`/learn/${s.slug}/1`} className="text-[24px] font-bold tracking-tight text-dark hover:text-rose">{s.name}</Link>
                  <p className="mt-1 text-[13px] text-muted">
                    {TYPE_LABEL[s.supplierType]}{s.countryName ? ` · ${s.countryName}` : ''}{s.tagline ? ` · ${s.tagline}` : ''}
                  </p>
                </div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-[12px] text-muted">
                  <span>Tvůj postup</span>
                  <b className="text-dark">{formatProgress(s.progress)}</b>
                </div>
                <ProgressSteps progress={s.progress} compact />
                <Link href={`/learn/${s.slug}/${nextChapter(s.progress.completedChapterNumbers)}`} className="mt-3 inline-block text-[12px] font-bold text-rose-dark hover:underline">
                  {s.progress.completed === 0 ? 'Začít studovat →' : s.progress.completed === 7 ? 'Zopakovat →' : 'Pokračovat →'}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

/** První nedokončená kapitola (nebo 1). */
function nextChapter(done: number[]): number {
  for (let n = 1; n <= 7; n++) if (!done.includes(n)) return n;
  return 1;
}
