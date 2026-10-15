'use client';
/**
 * Záložka „Kapitoly a otázky“: editace textu sedmi kapitol, schválení a kontrolní otázka
 * každé kapitoly (s doloženým faktem). Chybějící otázka je výrazně označena.
 */
import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { AdminChapter, AdminQuestion, Fact } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorBox, Loading } from '@/components/StateViews';
import { useApi } from '@/hooks/use-api';

export function ChaptersTab({ supplierId }: { supplierId: string }) {
  const chapters = useApi<AdminChapter[]>(`/admin/suppliers/${supplierId}/chapters`);
  const facts = useApi<Fact[]>(`/admin/suppliers/${supplierId}/facts`);
  const [error, setError] = useState<ApiError | string | null>(null);

  const regenerate = async (): Promise<void> => {
    try {
      chapters.setData(await api<AdminChapter[]>(`/admin/suppliers/${supplierId}/drafts`, { method: 'POST' }));
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e : String(e));
    }
  };

  if (chapters.loading && !chapters.data) return <Loading />;
  if (chapters.error) return <ErrorBox error={chapters.error} />;
  const verifiedFacts = (facts.data ?? []).filter((f) => f.status === 'verified');

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-[720px] text-[13px] leading-relaxed text-muted">
          Návrhy textů sestavila automatika z citací (bez AI) – <b>přepiš je do krátkého srozumitelného příběhu</b>. Upravené a schválené kapitoly se při novém importu nepřepisují.
          Syntaxe: prázdný řádek = odstavec, <code>## </code> mezititulek, <code>- </code> odrážka, <code>&gt; </code> citace.
        </p>
        <button type="button" className="btn btn-secondary" onClick={() => void regenerate()}>Přegenerovat neupravené návrhy</button>
      </div>
      {error && <ErrorBox error={error} />}
      {chapters.data?.map((chapter) => (
        <ChapterEditor
          key={`${chapter.id}-${chapter.version}-${chapter.status}-${chapter.question?.version ?? 0}-${chapter.question?.status ?? ''}`}
          chapter={chapter}
          verifiedFacts={verifiedFacts}
          onChanged={() => void chapters.reload()}
        />
      ))}
    </div>
  );
}

function ChapterEditor({ chapter, verifiedFacts, onChanged }: { chapter: AdminChapter; verifiedFacts: Fact[]; onChanged: () => void }) {
  const [lead, setLead] = useState(chapter.lead);
  const [body, setBody] = useState(chapter.body);
  const [highlight, setHighlight] = useState(chapter.highlight ?? '');
  const [error, setError] = useState<ApiError | string | null>(null);
  const dirty = lead !== chapter.lead || body !== chapter.body || highlight !== (chapter.highlight ?? '');

  const act = async (action: () => Promise<unknown>): Promise<void> => {
    try {
      await action();
      setError(null);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e : String(e));
    }
  };

  return (
    <section className="rounded-lg border border-line p-5 md:p-6" aria-labelledby={`ch-${chapter.id}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-[24px] font-extrabold text-rose">{String(chapter.number).padStart(2, '0')}</span>
        <h3 id={`ch-${chapter.id}`} className="text-[19px] font-bold text-dark">{chapter.title}</h3>
        <StatusBadge status={chapter.status} />
        {chapter.isGeneratedDraft && <span className="text-[11px] text-amber">automatický návrh – nutno přepsat</span>}
        {!chapter.question && <span className="rounded bg-rose-pale px-2 py-1 text-[10px] font-bold text-rose-dark">Chybí kontrolní otázka</span>}
      </div>
      {error && <ErrorBox error={error} />}
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3">
          <label className="field-label" htmlFor={`lead-${chapter.id}`}>Úvodní odstavec</label>
          <textarea id={`lead-${chapter.id}`} className="field min-h-[80px]" value={lead} onChange={(e) => setLead(e.target.value)} />
          <label className="field-label" htmlFor={`body-${chapter.id}`}>Výklad</label>
          <textarea id={`body-${chapter.id}`} className="field min-h-[220px] font-mono text-[12px]" value={body} onChange={(e) => setBody(e.target.value)} />
          {chapter.number === 2 && (
            <>
              <label className="field-label" htmlFor={`hl-${chapter.id}`}>Věděli jste, že…? (jen doložené)</label>
              <textarea id={`hl-${chapter.id}`} className="field min-h-[60px]" value={highlight} onChange={(e) => setHighlight(e.target.value)} />
            </>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-secondary" disabled={!dirty} onClick={() => void act(() => api(`/admin/chapters/${chapter.id}`, { method: 'PATCH', body: { lead, body, highlight: highlight.trim() ? highlight : null } }))}>Uložit text</button>
            <button type="button" className="btn" disabled={dirty || chapter.status === 'approved'} onClick={() => void act(() => api(`/admin/chapters/${chapter.id}/approve`, { method: 'POST' }))}>
              {chapter.status === 'approved' ? 'Schváleno' : 'Schválit kapitolu'}
            </button>
          </div>
        </div>
        <QuestionEditor chapterId={chapter.id} question={chapter.question} verifiedFacts={verifiedFacts} onChanged={onChanged} />
      </div>
    </section>
  );
}

function QuestionEditor({ chapterId, question, verifiedFacts, onChanged }: { chapterId: string; question: AdminQuestion | null; verifiedFacts: Fact[]; onChanged: () => void }) {
  const [prompt, setPrompt] = useState(question?.prompt ?? '');
  const [options, setOptions] = useState<string[]>(question?.options ?? ['', '', '', '']);
  const [correctIndex, setCorrectIndex] = useState(question?.correctIndex ?? 0);
  const [explanation, setExplanation] = useState(question?.explanation ?? '');
  const [factId, setFactId] = useState(question?.factId ?? '');
  const [error, setError] = useState<ApiError | string | null>(null);
  const linkedFact = verifiedFacts.find((f) => f.id === question?.factId);

  const save = async (): Promise<void> => {
    try {
      await api(`/admin/chapters/${chapterId}/question`, {
        method: 'PUT',
        body: { prompt, options: options.map((o) => o.trim()).filter(Boolean), correctIndex, explanation, factId: factId || null },
      });
      setError(null);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e : String(e));
    }
  };
  const approve = async (): Promise<void> => {
    try {
      await api(`/admin/chapters/${chapterId}/question/approve`, { method: 'POST' });
      setError(null);
      onChanged();
    } catch (e) {
      setError(e instanceof ApiError ? e : String(e));
    }
  };

  return (
    <div className="rounded-lg border border-[#e9d6d7] bg-[#fffbfb] p-4">
      <div className="mb-3 flex items-center gap-2">
        <p className="text-[10px] font-extrabold tracking-[1.4px] text-rose-dark uppercase">Kontrolní otázka</p>
        {question && <StatusBadge status={question.status} />}
        {question && <span className="text-[10px] text-muted">{question.origin === 'generated' ? 'návrh z faktu' : 'ručně'} · v{question.version}</span>}
      </div>
      {error && <ErrorBox error={error} />}
      <textarea className="field mb-2 min-h-[56px]" placeholder="Znění otázky" value={prompt} onChange={(e) => setPrompt(e.target.value)} aria-label="Znění otázky" />
      {options.map((option, i) => (
        <label key={i} className="mb-1.5 flex items-center gap-2">
          <input type="radio" name={`correct-${chapterId}`} checked={correctIndex === i} onChange={() => setCorrectIndex(i)} className="accent-rose" aria-label={`Možnost ${i + 1} je správná`} />
          <input className="field" value={option} placeholder={`Možnost ${String.fromCharCode(65 + i)}`} onChange={(e) => setOptions(options.map((o, j) => (j === i ? e.target.value : o)))} />
        </label>
      ))}
      <textarea className="field mt-1 min-h-[60px]" placeholder="Vysvětlení po odeslání (včetně souvisejícího faktu)" value={explanation} onChange={(e) => setExplanation(e.target.value)} aria-label="Vysvětlení" />
      <label className="field-label mt-2" htmlFor={`fact-${chapterId}`}>Doložení správné odpovědi (ověřený fakt)</label>
      <select id={`fact-${chapterId}`} className="field" value={factId} onChange={(e) => setFactId(e.target.value)}>
        <option value="">— bez vazby na fakt (odpovídá správce) —</option>
        {question?.factId && !linkedFact && <option value={question.factId}>Navázaný fakt zatím NENÍ ověřený</option>}
        {verifiedFacts.map((f) => <option key={f.id} value={f.id}>Kap. {f.chapter} · {f.label}: {f.value.slice(0, 70)}</option>)}
      </select>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="btn btn-secondary" onClick={() => void save()} disabled={!prompt.trim() || options.filter((o) => o.trim()).length < 2 || explanation.trim().length < 5}>Uložit otázku</button>
        <button type="button" className="btn" disabled={!question || question.status === 'approved'} onClick={() => void approve()}>
          {question?.status === 'approved' ? 'Schválena' : 'Schválit otázku'}
        </button>
      </div>
    </div>
  );
}
