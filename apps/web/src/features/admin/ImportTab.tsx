'use client';
/**
 * Záložka „Import a zdroje“: seznam zdrojů (URL, podstránky, dokumenty), přidání dalších
 * podkladů, spuštění importu a živý průběh (log + report: selhání, chybějící témata, rozpory, AI).
 */
import { useEffect, useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { ImportJob, Source, SourceSegment } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Empty, ErrorBox, Loading } from '@/components/StateViews';
import { useApi } from '@/hooks/use-api';
import { FileDropzone } from './FileDropzone';

const KIND_LABEL: Record<Source['kind'], string> = {
  'web-root': 'Web (zadaný)',
  web: 'Podstránka',
  pdf: 'PDF',
  docx: 'DOCX',
  xlsx: 'XLSX',
  text: 'Text',
};

export function ImportTab({ supplierId, onImported }: { supplierId: string; onImported: () => void }) {
  const sources = useApi<Source[]>(`/admin/suppliers/${supplierId}/sources`);
  const [job, setJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [url, setUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [openSource, setOpenSource] = useState<string | null>(null);
  const [segments, setSegments] = useState<SourceSegment[]>([]);

  const running = job?.status === 'queued' || job?.status === 'running';

  // Poslední import dodavatele (404 = import zatím neproběhl, není to chyba).
  useEffect(() => {
    let cancelled = false;
    api<ImportJob>(`/admin/suppliers/${supplierId}/imports/latest`)
      .then((latest) => {
        if (!cancelled) setJob(latest);
      })
      .catch((e: unknown) => {
        if (!cancelled && !(e instanceof ApiError && e.status === 404)) setError(e instanceof ApiError ? e : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [supplierId]);

  // Průběžné dotazování na stav běžícího importu; po dokončení obnovit zdroje i nadřazená data.
  useEffect(() => {
    if (!running || !job) return;
    const timer = window.setInterval(async () => {
      try {
        const next = await api<ImportJob>(`/admin/imports/${job.id}`);
        setJob(next);
        if (next.status !== 'queued' && next.status !== 'running') {
          void sources.reload();
          onImported();
        }
      } catch {
        // Dočasná chyba sítě – další pokus při příštím ticku.
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [running, job, sources, onImported]);

  const run = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      await action();
      await sources.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e : String(e));
    } finally {
      setBusy(false);
    }
  };

  const startImport = (): Promise<void> => run(async () => setJob(await api<ImportJob>(`/admin/suppliers/${supplierId}/imports`, { method: 'POST' })));

  const toggleSource = async (id: string): Promise<void> => {
    if (openSource === id) return setOpenSource(null);
    setOpenSource(id);
    setSegments(await api<SourceSegment[]>(`/admin/sources/${id}/segments`));
  };

  return (
    <div className="space-y-10">
      {error && <ErrorBox error={error} />}

      {/* Spuštění a průběh importu */}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[22px] font-bold text-dark">Průběh importu</h2>
          <button type="button" className="btn" disabled={running || busy} onClick={() => void startImport()}>
            {running ? 'Import běží…' : job ? 'Spustit import znovu' : 'Načíst a vytvořit návrh'}
          </button>
        </div>
        {!job && <p className="mt-2 text-[13px] text-muted">Import zatím neproběhl.</p>}
        {job && (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[12px] text-muted">
                <StatusBadge status={job.status} />
                {job.startedAt && <span>zahájeno {new Date(job.startedAt).toLocaleTimeString('cs-CZ')}</span>}
                {job.finishedAt && <span>· dokončeno {new Date(job.finishedAt).toLocaleTimeString('cs-CZ')}</span>}
              </div>
              <ol className="max-h-[360px] overflow-y-auto rounded-lg border border-line bg-[#fbfbfc] p-3 font-mono text-[11px] leading-5" aria-live="polite">
                {job.log.map((entry, i) => (
                  <li key={i} className={entry.level === 'error' ? 'text-rose-dark' : entry.level === 'warn' ? 'text-amber' : 'text-[#4c525c]'}>
                    <span className="text-[#a1a4aa]">{new Date(entry.at).toLocaleTimeString('cs-CZ')} </span>{entry.message}
                  </li>
                ))}
                {running && <li className="text-muted">…</li>}
              </ol>
            </div>
            {job.report && (
              <div className="space-y-4 text-[13px]">
                <div className="grid grid-cols-3 rounded-lg border border-line">
                  {[
                    [job.report.pagesFetched, 'stránek webu'],
                    [job.report.factsCreated, 'návrhů faktů'],
                    [job.report.productsDiscovered, 'produktů'],
                  ].map(([value, label], i) => (
                    <div key={String(label)} className={`p-4 ${i > 0 ? 'border-l border-line' : ''}`}>
                      <b className="block text-[24px] text-dark">{value}</b>
                      <small className="text-[#8a8e98]">{label}</small>
                    </div>
                  ))}
                </div>
                <div className="border-l-4 border-amber bg-amber-soft px-4 py-3 text-[#5a4420]">
                  <b className="block">AI krok: {job.report.ai.status === 'completed' ? 'proveden' : 'nezprovozněn'}</b>
                  {job.report.ai.message}
                </div>
                {job.report.conflicts.length > 0 && (
                  <div>
                    <p className="micro-label mb-1">Rozpory k vyřešení</p>
                    <ul className="ml-4 list-disc">{job.report.conflicts.map((c) => <li key={c.kind}>{c.label}: {c.values.join(' × ')}</li>)}</ul>
                  </div>
                )}
                {job.report.missingTopics.length > 0 && (
                  <div>
                    <p className="micro-label mb-1">Chybějící témata (nevymýšlet, doplnit ručně)</p>
                    <ul className="ml-4 list-disc">{job.report.missingTopics.map((m) => <li key={`${m.chapter}${m.topic}`}>Kap. {m.chapter}: {m.topic}</li>)}</ul>
                  </div>
                )}
                {job.report.failedUrls.length > 0 && (
                  <div>
                    <p className="micro-label mb-1">Neúspěšné / blokované URL</p>
                    <ul className="ml-4 list-disc break-all">{job.report.failedUrls.map((f) => <li key={f.url}>{f.url} – {f.reason}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Přidání dalších podkladů */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-[16px] font-bold text-dark">Přidat URL</h3>
          <div className="flex gap-2">
            <input className="field" type="url" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
            <button type="button" className="btn btn-secondary" disabled={!url || busy} onClick={() => void run(async () => { await api(`/admin/suppliers/${supplierId}/sources/url`, { method: 'POST', body: { url } }); setUrl(''); })}>Přidat</button>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-[16px] font-bold text-dark">Nahrát dokumenty</h3>
          <FileDropzone files={files} onChange={setFiles} />
          {files.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary mt-3"
              disabled={busy}
              onClick={() => void run(async () => {
                const form = new FormData();
                files.forEach((f) => form.append('files', f));
                await api(`/admin/suppliers/${supplierId}/sources/files`, { method: 'POST', formData: form });
                setFiles([]);
              })}
            >
              Nahrát {files.length} soubor(y)
            </button>
          )}
        </div>
      </section>

      {/* Seznam zdrojů */}
      <section>
        <h2 className="mb-3 text-[22px] font-bold text-dark">Zdroje ({sources.data?.length ?? 0})</h2>
        {sources.loading && !sources.data && <Loading />}
        {sources.data?.length === 0 && <Empty title="Žádné zdroje">Přidej URL nebo dokument a spusť import.</Empty>}
        <ul className="border-t border-line">
          {sources.data?.map((s) => (
            <li key={s.id} className="border-b border-line py-3 text-[13px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#f0f1f4] px-2 py-0.5 text-[10px] font-bold text-[#656973]">{KIND_LABEL[s.kind]}</span>
                <StatusBadge status={s.status} />
                <span className="rounded bg-[#f0f1f4] px-2 py-0.5 text-[10px] text-[#656973]">{s.origin === 'internal' ? 'interní podklad' : s.origin === 'external' ? 'externí zdroj' : 'oficiální zdroj'}</span>
                <b className="text-dark">{s.title}</b>
                {s.url && <a href={s.url} target="_blank" rel="noopener noreferrer" className="max-w-[420px] truncate text-[12px] text-rose-dark hover:underline">{s.url}</a>}
                <span className="ml-auto text-[11px] text-muted">{s.textLength.toLocaleString('cs-CZ')} znaků{s.retrievedAt ? ` · ${new Date(s.retrievedAt).toLocaleString('cs-CZ')}` : ''}</span>
                {s.textLength > 0 && (
                  <button type="button" className="text-[11px] font-bold text-rose-dark hover:underline" onClick={() => void toggleSource(s.id)}>
                    {openSource === s.id ? 'skrýt text' : 'zobrazit text'}
                  </button>
                )}
              </div>
              {s.error && <p className="mt-1 text-[12px] text-rose-dark">{s.error}</p>}
              {s.warnings.map((w) => <p key={w} className="mt-1 text-[12px] text-amber">{w}</p>)}
              {openSource === s.id && (
                <ol className="mt-2 max-h-[300px] overflow-y-auto rounded border border-line bg-[#fbfbfc] p-3 text-[12px]">
                  {segments.map((seg) => (
                    <li key={seg.id} className="mb-2"><span className="font-bold text-muted">{seg.location}: </span>{seg.text}</li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
