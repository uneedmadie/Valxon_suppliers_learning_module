/**
 * Vizuální části jednotlivých kapitol. Každý vizuál pracuje výhradně s ověřenými fakty;
 * pokud data chybí, sekce se nevykreslí (nic se nedomýšlí ani nevyplňuje balastem).
 */
import type { LearnChapter, LearnFact, LearnSupplier } from '@/api/types';
import { factsOf, NARRATIVE_KINDS, splitMilestone, VISUAL_KINDS } from './facts';
import { LocationMap } from './LocationMap';

/* ---------- Kapitola 1: hero, klíčová čísla, mapa ---------- */

export function IntroHero({ supplier }: { supplier: LearnSupplier }) {
  const founded = factsOf(supplier, 'founded')[0]?.value;
  const categories = factsOf(supplier, 'category').length;
  const stats = [
    supplier.location && { value: supplier.location.countryCode, label: `sídlo: ${supplier.location.countryName}` },
    founded && { value: founded, label: 'rok založení' },
    categories > 0 && { value: String(categories), label: 'doložených kategorií nabídky' },
  ].filter((s): s is { value: string; label: string } => Boolean(s));

  return (
    <>
      <div className="relative my-7 flex min-h-[220px] items-end overflow-hidden rounded-[10px] bg-dark p-7 text-white md:p-9">
        {supplier.heroImageUrl && (
          <>
            <img src={supplier.heroImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#35383df2] via-[#35383dcc] to-[#35383d55]" aria-hidden />
          </>
        )}
        <div aria-hidden className="absolute -top-[170px] -right-[70px] h-[390px] w-[390px] rounded-full border border-white/10" />
        <div className="relative z-10 max-w-[520px]">
          <p className="kicker !text-[#ff7a7d]">Seznam se s dodavatelem</p>
          <p className="mt-2 text-[30px] leading-tight font-extrabold tracking-[-1px]">{supplier.name}</p>
          {supplier.tagline && <p className="mt-2 text-[16px] text-[#e3e5e8]">{supplier.tagline}</p>}
        </div>
      </div>
      {stats.length > 0 && (
        <div className="my-7 grid border-y border-line" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
          {stats.map((s, i) => (
            <div key={s.label} className={`px-3 py-4 ${i > 0 ? 'border-l border-line' : 'pl-0'}`}>
              <b className="block text-[25px] font-extrabold text-dark">{s.value}</b>
              <span className="text-[11px] text-[#81858c]">{s.label}</span>
            </div>
          ))}
        </div>
      )}
      {supplier.location && <LocationMap location={supplier.location} supplierName={supplier.name} />}
    </>
  );
}

/* ---------- Kapitola 2: vize, časová osa, „Věděli jste…“ ---------- */

export function StoryVisual({ chapter }: { chapter: LearnChapter }) {
  const by = (kind: string): LearnFact[] => chapter.facts.filter((f) => f.kind === kind);
  const founded = by('founded')[0];
  const vision = [...by('vision'), ...by('mission')];
  const milestones = by('milestone').map((f) => splitMilestone(f.value)).sort((a, b) => a.year.localeCompare(b.year));
  const timeline = founded ? [{ year: founded.value, text: 'Založení společnosti' }, ...milestones.filter((m) => m.year !== founded.value)] : milestones;

  return (
    <>
      {vision.map((v) => (
        <blockquote key={v.value} className="quote-line">
          {/* Studentský popisek podle druhu – popisky faktů jsou určené správci. */}
          <span className="micro-label mb-1 block !text-rose-dark">{v.kind === 'mission' ? 'Mise' : 'Vize'}</span>
          {v.value}
        </blockquote>
      ))}
      {timeline.length > 0 && (
        <section className="my-8" aria-label="Časová osa">
          <h2 className="mb-4 text-[23px] font-bold tracking-[-0.5px] text-dark">Milníky</h2>
          <ol className="relative border-l-2 border-rose-pale pl-6">
            {timeline.map((m) => (
              <li key={`${m.year}${m.text}`} className="relative mb-6 last:mb-0">
                <span className="absolute top-1 -left-[33px] h-4 w-4 rounded-full border-[3px] border-white bg-rose shadow" aria-hidden />
                <b className="block text-[19px] font-extrabold text-rose">{m.year}</b>
                <p className="mt-1 text-[14px] leading-relaxed text-[#4c525c]">{m.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  );
}

/* ---------- Kapitola 3: orientace v nabídce ---------- */

export function OfferVisual({ chapter }: { chapter: LearnChapter }) {
  const categories = chapter.facts.filter((f) => f.kind === 'category');
  if (categories.length === 0) return null;
  return (
    <section className="my-8" aria-label="Kategorie nabídky">
      <p className="micro-label mb-3">Hlavní kategorie</p>
      <ol className="grid border-t border-line sm:grid-cols-2">
        {categories.map((c, i) => (
          <li key={c.value} className="flex items-baseline gap-4 border-b border-line py-4 sm:odd:pr-6 sm:even:border-l sm:even:pl-6">
            <span className="w-7 text-[13px] font-extrabold text-rose">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-[16px] font-semibold text-dark">{c.value}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Kapitola 4: bestsellery od správce / reprezentativní výběr ---------- */

export function ProductsVisual({ chapter }: { chapter: LearnChapter }) {
  const isBestsellers = chapter.productListType === 'bestsellers';
  return (
    <section className="my-8" aria-label="Produkty">
      <div className={`mb-6 border-l-4 px-5 py-4 text-[13px] leading-relaxed ${isBestsellers ? 'border-green bg-fresh text-[#24533f]' : 'border-[#667481] bg-[#f2f6f8] text-[#4b535a]'}`}>
        {isBestsellers
          ? 'Seznam nejprodávanějších produktů dodal správce VALXON. Fotografie jsou zobrazeny jen u produktů jednoznačně spárovaných s podklady dodavatele.'
          : 'Reprezentativní výběr produktů z podkladů dodavatele – nejde o seznam bestsellerů.'}
      </div>
      {chapter.products.length === 0 && <p className="text-[14px] text-muted">Produkty pro tuto kapitolu zatím nebyly vybrány.</p>}
      <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
        {chapter.products.map((p, i) => (
          <li key={p.id}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-pale">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt={p.name} className="h-full w-full object-contain p-3" loading="lazy" />
              ) : (
                <div className="grid h-full place-items-center px-6 text-center text-[12px] text-[#9a9fa8]">Fotografie zatím nebyla ověřena</div>
              )}
              <span className="absolute top-3 left-3 rounded bg-white/90 px-2 py-1 text-[12px] font-extrabold text-rose">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <h3 className="mt-3 text-[17px] font-bold text-dark">{p.name}</h3>
            <p className="text-[11px] text-[#90949d]">{[p.sku && `SKU ${p.sku}`, p.category].filter(Boolean).join(' · ')}</p>
            {p.material && <p className="mt-1 text-[13px] text-[#4c525c]"><b>Materiál:</b> {p.material}</p>}
            {p.description && <p className="mt-1 line-clamp-4 text-[13px] leading-relaxed text-[#4c525c]">{p.description}</p>}
            {p.productUrl && <a href={p.productUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[12px] font-bold text-rose-dark hover:underline">Stránka produktu ↗</a>}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ---------- Kapitola 5: technologie ---------- */

export function TechniquesVisual({ chapter }: { chapter: LearnChapter }) {
  const techniques = chapter.facts.filter((f) => f.kind === 'technique');
  const certifications = chapter.facts.filter((f) => f.kind === 'certification');
  return (
    <>
      {techniques.length > 0 && (
        <section className="my-8 border-t border-line" aria-label="Technologie zušlechtění">
          {techniques.map((t, i) => (
            <div key={t.value} className="grid grid-cols-[44px_1fr] border-b border-line py-4">
              <span className="text-[19px] font-extrabold text-rose">{i + 1}</span>
              <div>
                <strong className="block text-[16px] text-dark">{t.value}</strong>
                <span className="text-[12px] text-muted">{t.label}</span>
              </div>
            </div>
          ))}
        </section>
      )}
      {certifications.length > 0 && (
        <div className="my-6">
          <p className="micro-label mb-2">Certifikace a standardy</p>
          <div className="flex flex-wrap gap-2">
            {certifications.map((c) => <span key={c.value} className="rounded bg-fresh px-2.5 py-1 text-[12px] font-bold text-green">{c.value}</span>)}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- Kapitola 6: obchodní podmínky a scénáře ---------- */

const BUSINESS_ROWS: { kind: string; label: string }[] = [
  { kind: 'moq', label: 'Minimální objednávka' },
  { kind: 'lead_time', label: 'Výroba a dodání' },
  { kind: 'samples', label: 'Vzorky' },
  { kind: 'ordering', label: 'Objednávka' },
  { kind: 'complaints', label: 'Reklamace' },
  { kind: 'shipping', label: 'Doprava' },
  { kind: 'contact', label: 'Kontakt' },
];

export function BusinessVisual({ chapter }: { chapter: LearnChapter }) {
  const rows = BUSINESS_ROWS.map((r) => ({ ...r, values: chapter.facts.filter((f) => f.kind === r.kind) })).filter((r) => r.values.length > 0);
  const fit = chapter.facts.filter((f) => f.kind === 'client_fit');
  const weak = chapter.facts.filter((f) => f.kind === 'weakness');
  return (
    <>
      {(fit.length > 0 || weak.length > 0) && (
        <div className="my-8 grid gap-6 md:grid-cols-2">
          {fit.length > 0 && (
            <div className="border-l-4 border-green bg-fresh px-5 py-4">
              <b className="mb-2 block text-[13px] text-green">Pro jakého klienta</b>
              <ul className="ml-4 list-disc text-[14px] leading-7 text-[#2f4d40]">{fit.map((f) => <li key={f.value}>{f.value}</li>)}</ul>
            </div>
          )}
          {weak.length > 0 && (
            <div className="border-l-4 border-amber bg-amber-soft px-5 py-4">
              <b className="mb-2 block text-[13px] text-amber">Na co si dát pozor</b>
              <ul className="ml-4 list-disc text-[14px] leading-7 text-[#5a4420]">{weak.map((f) => <li key={f.value}>{f.value}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      {rows.length > 0 && (
        <div className="my-8 overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <caption className="sr-only">Obchodní fakta dodavatele</caption>
            <tbody>
              {rows.map((r) => (
                <tr key={r.kind} className="border-b border-[#eceef1] last:border-0">
                  <th scope="row" className="w-[190px] bg-[#f5f6f8] px-4 py-3.5 align-top text-[11px] tracking-[0.5px] text-[#69707a] uppercase">{r.label}</th>
                  <td className="px-4 py-3.5 align-top text-[#40454d]">
                    {r.values.map((v) => <p key={v.value} className="mb-1 last:mb-0">{v.value}</p>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- Kapitola 7: zapamatuj si ---------- */

export function RecapVisual() {
  return (
    <div className="my-8 border-l-4 border-[#667481] bg-[#f2f6f8] px-5 py-4 text-[13px] leading-relaxed text-[#4b535a]">
      <b className="mb-1 block text-dark">Co dál?</b>
      Dokončení sedmi kapitol není certifikace. Certifikát „Certifikovaný znalec“ navazuje až na úspěšně složený
      schválený závěrečný test, jehož hranici stanoví VALXON.
    </div>
  );
}

/* ---------- Ostatní ověřená fakta kapitoly ---------- */

export function RemainingFacts({ chapter }: { chapter: LearnChapter }) {
  const consumed = new Set(VISUAL_KINDS[chapter.number] ?? []);
  const rest = chapter.facts.filter((f) => !consumed.has(f.kind) && !NARRATIVE_KINDS.has(f.kind));
  if (rest.length === 0) return null;
  return (
    <section className="my-8">
      <p className="micro-label mb-2">Doložené údaje</p>
      <dl className="border-t border-line">
        {rest.map((f) => (
          <div key={`${f.kind}${f.value}`} className="grid gap-1 border-b border-line py-3 sm:grid-cols-[200px_1fr]">
            <dt className="text-[12px] font-bold text-dark">{f.label}</dt>
            <dd className="text-[14px] leading-relaxed text-[#4c525c]">{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
