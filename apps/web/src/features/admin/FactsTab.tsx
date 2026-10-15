'use client';
/**
 * Záložka „Fakta“: navržená fakta s doslovnou citací a zdrojem, ověření/zamítnutí/úprava
 * (jednotlivě i hromadně) a ruční doplnění. Student uvidí jen fakta ve stavu „Ověřeno“.
 */
import { FormEvent, useMemo, useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { Fact, FactStatus } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorBox, Loading } from '@/components/StateViews';
import { useApi } from '@/hooks/use-api';

const CHAPTERS = ['Seznam se s dodavatelem', 'Příběh, vize a hodnoty', 'Co všechno nabízejí?', 'Produkty', 'Technologie a specializace', 'Kdy a proč využít?', 'Co si zapamatovat?'];

/** Druhy faktů nabízené při ručním zadání. */
const MANUAL_KINDS: { kind: string; label: string; chapter: number }[] = [
  { kind: 'description', label: 'Kdo je dodavatel', chapter: 1 },
  { kind: 'headquarters', label: 'Sídlo', chapter: 1 },
  { kind: 'specialization', label: 'Specializace', chapter: 1 },
  { kind: 'founded', label: 'Rok založení', chapter: 2 },
  { kind: 'vision', label: 'Vize', chapter: 2 },
  { kind: 'mission', label: 'Mise', chapter: 2 },
  { kind: 'milestone', label: 'Milník (formát „ROK: text“)', chapter: 2 },
  { kind: 'founder', label: 'Zakladatel', chapter: 2 },
  { kind: 'did_you_know', label: 'Věděli jste, že…', chapter: 2 },
  { kind: 'category', label: 'Kategorie nabídky', chapter: 3 },
  { kind: 'technique', label: 'Technologie zušlechtění', chapter: 5 },
  { kind: 'print_area', label: 'Tisková plocha', chapter: 5 },
  { kind: 'certification', label: 'Certifikace', chapter: 5 },
  { kind: 'moq', label: 'Minimální objednávka', chapter: 6 },
  { kind: 'lead_time', label: 'Lhůta výroby/dodání', chapter: 6 },
  { kind: 'samples', label: 'Vzorky', chapter: 6 },
  { kind: 'ordering', label: 'Objednávka', chapter: 6 },
  { kind: 'complaints', label: 'Reklamace', chapter: 6 },
  { kind: 'shipping', label: 'Doprava', chapter: 6 },
  { kind: 'contact', label: 'Kontakt', chapter: 6 },
  { kind: 'client_fit', label: 'Pro jakého klienta', chapter: 6 },
  { kind: 'weakness', label: 'Slabina / na co si dát pozor', chapter: 6 },
  { kind: 'image_hero', label: 'Úvodní fotografie (URL)', chapter: 1 },
];

export function FactsTab({ supplierId }: { supplierId: string }) {
  const { data, error, loading, reload } = useApi<Fact[]>(`/admin/suppliers/${supplierId}/facts`);
  const [chapterFilter, setChapterFilter] = useState<number | 0>(0);
  const [statusFilter, setStatusFilter] = useState<FactStatus | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [actionError, setActionError] = useState<ApiError | string | null>(null);

  const visible = useMemo(
    () => (data ?? []).filter((f) => (chapterFilter === 0 || f.chapter === chapterFilter) && (statusFilter === 'all' || f.status === statusFilter)),
    [data, chapterFilter, statusFilter],
  );

  const act = async (action: () => Promise<unknown>): Promise<void> => {
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : String(e));
    }
  };

  const setStatus = (id: string, status: FactStatus): Promise<void> => act(() => api(`/admin/facts/${id}`, { method: 'PATCH', body: { status } }));
  const bulk = (status: FactStatus): Promise<void> =>
    act(async () => {
      await api('/admin/facts/bulk-status', { method: 'PATCH', body: { ids: [...selected], status } });
      setSelected(new Set());
    });

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const counts = { verified: data?.filter((f) => f.status === 'verified').length ?? 0, proposed: data?.filter((f) => f.status === 'proposed').length ?? 0 };

  return (
    <div>
      <p className="mb-4 max-w-[760px] text-[13px] leading-relaxed text-muted">
        Fakta vytěžila deterministická extrakce (bez AI) – jsou to <b>návrhy s citací</b>. Ověř jen to, co citace skutečně dokládá; neznámé nevymýšlej.
        Ověřeno: <b className="text-green">{counts.verified}</b> · čeká: <b className="text-amber">{counts.proposed}</b>
      </p>
      {actionError && <ErrorBox error={actionError} />}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className="field !w-auto" value={chapterFilter} onChange={(e) => setChapterFilter(Number(e.target.value))} aria-label="Filtr kapitoly">
          <option value={0}>Všechny kapitoly</option>
          {CHAPTERS.map((c, i) => <option key={c} value={i + 1}>{i + 1}. {c}</option>)}
        </select>
        <select className="field !w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as FactStatus | 'all')} aria-label="Filtr stavu">
          <option value="all">Všechny stavy</option>
          <option value="proposed">Návrhy k ověření</option>
          <option value="verified">Ověřené</option>
          <option value="rejected">Zamítnuté</option>
        </select>
        <span className="ml-auto text-[12px] text-muted">Vybráno {selected.size}</span>
        <button type="button" className="btn btn-small" disabled={selected.size === 0} onClick={() => void bulk('verified')}>Ověřit vybrané</button>
        <button type="button" className="btn btn-small btn-secondary" disabled={selected.size === 0} onClick={() => void bulk('rejected')}>Zamítnout vybrané</button>
      </div>

      <ul className="border-t border-line">
        {visible.map((f) => (
          <li key={f.id} className={`grid grid-cols-[24px_1fr] gap-3 border-b border-line py-4 ${f.status === 'rejected' ? 'opacity-55' : ''}`}>
            <input
              type="checkbox"
              aria-label={`Vybrat fakt ${f.label}`}
              checked={selected.has(f.id)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(f.id);
                else next.delete(f.id);
                setSelected(next);
              }}
              className="mt-1 accent-rose"
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="font-extrabold text-rose">Kap. {f.chapter}</span>
                <b className="text-[13px] text-dark">{f.label}</b>
                <StatusBadge status={f.status} />
                <StatusBadge status={f.confidence} />
                <span className="rounded bg-[#f0f1f4] px-1.5 py-1 text-[10px] text-[#656973]">{f.origin === 'manual' ? 'ručně správcem' : f.origin === 'external' ? 'externí zdroj' : 'oficiální podklad'}</span>
              </div>
              {editing?.id === f.id ? (
                <div className="mt-2 flex gap-2">
                  <textarea className="field min-h-[70px]" value={editing.value} onChange={(e) => setEditing({ id: f.id, value: e.target.value })} />
                  <div className="flex flex-col gap-2">
                    <button type="button" className="btn btn-small" onClick={() => void act(async () => { await api(`/admin/facts/${f.id}`, { method: 'PATCH', body: { value: editing.value } }); setEditing(null); })}>Uložit</button>
                    <button type="button" className="btn btn-small btn-secondary" onClick={() => setEditing(null)}>Zrušit</button>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-[14px] break-words text-[#2c2f34]">{f.value}</p>
              )}
              {f.quote && f.quote !== f.value && <blockquote className="mt-2 border-l-2 border-[#cbd0d7] pl-3 text-[12px] break-words text-[#626976]">„{f.quote}“</blockquote>}
              <p className="mt-1.5 text-[11px] break-all text-muted">
                Zdroj: {f.location && /^https?:\/\//.test(f.location) ? <a href={f.location} target="_blank" rel="noopener noreferrer" className="text-rose-dark underline">{f.location}</a> : f.location ?? '—'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {f.status !== 'verified' && <button type="button" className="btn btn-small" onClick={() => void setStatus(f.id, 'verified')}>Ověřit</button>}
                {f.status !== 'rejected' && <button type="button" className="btn btn-small btn-secondary" onClick={() => void setStatus(f.id, 'rejected')}>Zamítnout</button>}
                {f.status !== 'proposed' && <button type="button" className="btn btn-small btn-secondary" onClick={() => void setStatus(f.id, 'proposed')}>Vrátit k ověření</button>}
                <button type="button" className="btn btn-small btn-secondary" onClick={() => setEditing({ id: f.id, value: f.value })}>Upravit</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {visible.length === 0 && <p className="py-6 text-[13px] text-muted">Žádná fakta pro zvolený filtr.</p>}

      <ManualFactForm supplierId={supplierId} onCreated={() => void reload()} />
    </div>
  );
}

/** Ruční doplnění faktu správcem (je rovnou ověřený – správce za něj odpovídá). */
function ManualFactForm({ supplierId, onCreated }: { supplierId: string; onCreated: () => void }) {
  const [kindIndex, setKindIndex] = useState(0);
  const [value, setValue] = useState('');
  const [location, setLocation] = useState('');
  const [error, setError] = useState<ApiError | string | null>(null);
  const kind = MANUAL_KINDS[kindIndex]!;

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    try {
      await api(`/admin/suppliers/${supplierId}/facts`, {
        method: 'POST',
        body: { chapter: kind.chapter, kind: kind.kind, label: kind.label.replace(/ \(.*\)$/, ''), value: value.trim(), ...(location.trim() ? { location: location.trim() } : {}) },
      });
      setValue('');
      setLocation('');
      setError(null);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err : String(err));
    }
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="mt-10 rounded-lg border border-[#f0d9d9] bg-[#fffdfd] p-5">
      <h3 className="text-[16px] font-bold text-dark">Doplnit fakt ručně</h3>
      <p className="mb-3 text-[12px] text-muted">Např. údaj z ceníku nebo od obchodního zástupce. Uveď, odkud ho víš.</p>
      {error && <ErrorBox error={error} />}
      <div className="grid gap-3 md:grid-cols-[240px_1fr]">
        <select className="field" value={kindIndex} onChange={(e) => setKindIndex(Number(e.target.value))} aria-label="Druh faktu">
          {MANUAL_KINDS.map((k, i) => <option key={k.kind} value={i}>Kap. {k.chapter}: {k.label}</option>)}
        </select>
        <textarea className="field min-h-[44px]" required value={value} onChange={(e) => setValue(e.target.value)} placeholder="Hodnota / tvrzení" />
        <span />
        <input className="field" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zdroj (např. Ceník 2026, str. 3 / e-mail od dodavatele)" />
      </div>
      <button type="submit" className="btn mt-3" disabled={!value.trim()}>Přidat ověřený fakt</button>
    </form>
  );
}
