'use client';
/**
 * Záložka „Profil a publikace“: hero heslo, sídlo pro mapu, typ dodavatele,
 * kontrola připravenosti (7 schválených kapitol + 7 schválených otázek) a publikace.
 */
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { AdminSupplier, PublishCheck, SupplierType } from '@/api/types';
import { ErrorBox } from '@/components/StateViews';
import { useApi } from '@/hooks/use-api';

const TYPES: { value: SupplierType; label: string }[] = [
  { value: 'unknown', label: 'Neurčeno' },
  { value: 'specialist', label: 'Specialista' },
  { value: 'narrow', label: 'Úzká kategorie' },
  { value: 'generalist', label: 'Generalista (tisíce položek)' },
];

export function PublishTab({ supplier, onChanged }: { supplier: AdminSupplier; onChanged: (s: AdminSupplier) => void }) {
  const countries = useApi<{ code: string; name: string }[]>('/admin/meta/countries');
  const check = useApi<PublishCheck>(`/admin/suppliers/${supplier.id}/publish-check`);
  const [tagline, setTagline] = useState(supplier.tagline ?? '');
  const [hqCity, setHqCity] = useState(supplier.hqCity ?? '');
  const [hqCountryCode, setHqCountryCode] = useState(supplier.hqCountryCode ?? '');
  const [supplierType, setSupplierType] = useState<SupplierType>(supplier.supplierType);
  const [error, setError] = useState<ApiError | string | null>(null);
  const [saved, setSaved] = useState(false);

  const act = async (action: () => Promise<AdminSupplier>): Promise<void> => {
    setError(null);
    setSaved(false);
    try {
      onChanged(await action());
      setSaved(true);
      await check.reload();
    } catch (e) {
      setError(e instanceof ApiError ? e : String(e));
    }
  };

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <section>
        <h2 className="mb-1 text-[22px] font-bold text-dark">Profil pro studenty</h2>
        <p className="mb-4 text-[13px] text-muted">Sídlo vyplň jen podle ověřeného faktu (po ověření faktu „Sídlo“ se doplní samo, pokud je prázdné).</p>
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="tagline">Heslo do úvodu (hero)</label>
            <input id="tagline" className="field" maxLength={240} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Krátké, doložitelné heslo" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="city">Město sídla</label>
              <input id="city" className="field" value={hqCity} onChange={(e) => setHqCity(e.target.value)} />
            </div>
            <div>
              <label className="field-label" htmlFor="country">Země sídla (mapa)</label>
              <select id="country" className="field" value={hqCountryCode} onChange={(e) => setHqCountryCode(e.target.value)}>
                <option value="">— neuvedeno —</option>
                {countries.data?.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="type">Typ dodavatele</label>
            <select id="type" className="field" value={supplierType} onChange={(e) => setSupplierType(e.target.value as SupplierType)}>
              {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void act(() => api<AdminSupplier>(`/admin/suppliers/${supplier.id}`, { method: 'PATCH', body: { tagline: tagline || null, hqCity: hqCity || null, hqCountryCode: hqCountryCode || null, supplierType } }))}
          >
            Uložit profil
          </button>
          {saved && <span className="ml-3 text-[12px] text-green">Uloženo.</span>}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-[22px] font-bold text-dark">Publikace</h2>
        <p className="mb-4 text-[13px] text-muted">Publikovat lze až po schválení všech 7 kapitol a jejich kontrolních otázek. Student pak uvidí jen schválený text a ověřená fakta.</p>
        {error && <ErrorBox error={error} />}
        {check.data && (
          check.data.ready ? (
            <div className="mb-4 border-l-4 border-green bg-fresh px-4 py-3 text-[13px] text-[#24533f]">Vše je schválené – dodavatele lze publikovat.</div>
          ) : (
            <div className="mb-4 border-l-4 border-amber bg-amber-soft px-4 py-3 text-[13px] text-[#5a4420]">
              <b className="mb-1 block">Před publikací zbývá:</b>
              <ul className="ml-4 list-disc leading-7">{check.data.problems.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          )
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" disabled={!check.data?.ready} onClick={() => void act(() => api<AdminSupplier>(`/admin/suppliers/${supplier.id}/publish`, { method: 'POST' }))}>
            {supplier.status === 'published' ? 'Publikovat znovu (nová verze)' : 'Publikovat'}
          </button>
          {supplier.status === 'published' && (
            <>
              <Link href={`/learn/${supplier.slug}/1`} className="btn btn-dark">Otevřít v katalogu</Link>
              <button type="button" className="btn btn-secondary" onClick={() => void act(() => api<AdminSupplier>(`/admin/suppliers/${supplier.id}/unpublish`, { method: 'POST' }))}>Stáhnout z publikace</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
