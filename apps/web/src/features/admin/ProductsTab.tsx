'use client';
/**
 * Záložka „Produkty“: seznam TOP 10 bestsellerů od správce s párováním na podklady
 * (shoda, kandidáti k potvrzení, ruční fotografie) a reprezentativní výběr z objevených produktů.
 */
import { useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { AdminProduct } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorBox, Loading } from '@/components/StateViews';
import { useApi } from '@/hooks/use-api';
import { formatBestsellers, parseBestsellers } from './bestsellers';

export function ProductsTab({ supplierId }: { supplierId: string }) {
  const { data, error, loading, reload, setData } = useApi<AdminProduct[]>(`/admin/suppliers/${supplierId}/products`);
  const [listText, setListText] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<ApiError | string | null>(null);

  const act = async (action: () => Promise<unknown>): Promise<void> => {
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await reload();
    } catch (e) {
      setActionError(e instanceof ApiError ? e : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (loading && !data) return <Loading />;
  if (error) return <ErrorBox error={error} />;
  const bestsellers = (data ?? []).filter((p) => p.listType === 'bestseller');
  const discovered = (data ?? []).filter((p) => p.listType === 'discovered');
  const text = listText ?? formatBestsellers(bestsellers);
  const parsed = parseBestsellers(text);

  return (
    <div className="space-y-12">
      {actionError && <ErrorBox error={actionError} />}

      <section>
        <h2 className="text-[22px] font-bold text-dark">TOP 10 bestsellerů</h2>
        <p className="mt-1 mb-3 max-w-[760px] text-[13px] text-muted">
          Názvy skutečných bestsellerů dodává správce (ideálně se SKU nebo URL). Systém je nikdy nevybírá sám. Shoda podle URL/SKU/přesného názvu se spáruje automaticky,
          podobný název čeká na tvé potvrzení. Fotografie se zobrazí jen u spárovaného produktu.
        </p>
        <textarea className="field min-h-[140px] font-mono text-[12px]" value={text} onChange={(e) => setListText(e.target.value)} placeholder="Název | SKU | URL – jeden produkt na řádek" aria-label="Seznam bestsellerů" />
        {parsed.errors.length > 0 && <p className="mt-1 text-[12px] text-rose-dark">{parsed.errors.join(' ')}</p>}
        <div className="mt-2 flex gap-2">
          <button type="button" className="btn" disabled={busy || parsed.errors.length > 0} onClick={() => void act(async () => { setData(await api<AdminProduct[]>(`/admin/suppliers/${supplierId}/bestsellers`, { method: 'PUT', body: { items: parsed.items } })); setListText(null); })}>
            {busy ? 'Páruji…' : 'Uložit seznam a spárovat'}
          </button>
          {bestsellers.length > 0 && <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => void act(() => api(`/admin/suppliers/${supplierId}/products/match`, { method: 'POST' }))}>Znovu spárovat</button>}
        </div>

        <ol className="mt-6 border-t border-line">
          {bestsellers.map((p) => <BestsellerRow key={p.id} product={p} onAction={act} />)}
        </ol>
      </section>

      <section>
        <h2 className="text-[22px] font-bold text-dark">Produkty nalezené v podkladech ({discovered.length})</h2>
        <p className="mt-1 mb-3 max-w-[760px] text-[13px] text-muted">
          Pokud správce nedodá bestsellery, kapitola 4 se jmenuje „Reprezentativní výběr produktů“ a obsahuje produkty, které zde ručně zařadíš.
          {bestsellers.length > 0 && ' (Seznam bestsellerů je vyplněný, proto se v lekci zobrazí bestsellery.)'}
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          <input className="field !w-auto min-w-[320px] flex-1" type="url" placeholder="URL stránky produktu na webu dodavatele" value={productUrl} onChange={(e) => setProductUrl(e.target.value)} aria-label="URL stránky produktu" />
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!productUrl || busy}
            onClick={() => void act(async () => { await api(`/admin/suppliers/${supplierId}/products/from-url`, { method: 'POST', body: { url: productUrl } }); setProductUrl(''); })}
          >
            Přidat produkt z URL
          </button>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {discovered.map((p) => (
            <li key={p.id} className={`flex gap-3 rounded-lg border p-3 ${p.showInLesson ? 'border-rose bg-[#fff8f8]' : 'border-line'}`}>
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-pale">{p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-contain" />}</div>
              <div className="min-w-0 flex-1 text-[12px]">
                <b className="block truncate text-[13px] text-dark">{p.name}</b>
                <span className="block truncate text-muted">{[p.sku, p.category, p.location].filter(Boolean).join(' · ')}</span>
                <label className="mt-1 flex items-center gap-2 font-bold text-dark">
                  <input type="checkbox" className="accent-rose" checked={p.showInLesson} onChange={(e) => void act(() => api(`/admin/products/${p.id}`, { method: 'PATCH', body: { showInLesson: e.target.checked } }))} />
                  Zařadit do výběru
                </label>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function BestsellerRow({ product: p, onAction }: { product: AdminProduct; onAction: (action: () => Promise<unknown>) => Promise<void> }) {
  const [imageUrl, setImageUrl] = useState('');
  return (
    <li className="grid gap-4 border-b border-line py-4 md:grid-cols-[96px_1fr]">
      <div className="h-24 w-24 overflow-hidden rounded bg-pale">
        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-contain" /> : <span className="grid h-full place-items-center px-2 text-center text-[10px] text-muted">bez ověřené fotky</span>}
      </div>
      <div className="min-w-0 text-[13px]">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-rose">#{p.position}</b>
          <b className="text-dark">{p.name}</b>
          <StatusBadge status={p.matchStatus} />
          {p.showInLesson && <span className="text-[11px] text-green">v lekci</span>}
        </div>
        <p className="text-[11px] text-muted">Zadáno: {[p.inputName, p.inputSku, p.inputUrl].filter(Boolean).join(' | ')}</p>
        {p.productUrl && <a href={p.productUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] break-all text-rose-dark underline">{p.productUrl}</a>}
        {p.matchStatus === 'ambiguous' && (
          <div className="mt-2">
            <p className="micro-label mb-1">Kandidáti – potvrď přesný produkt</p>
            <ul className="space-y-1">
              {p.candidates.map((c, i) => (
                <li key={`${c.name}${i}`} className="flex flex-wrap items-center gap-2">
                  <span className="text-dark">{c.name}</span>
                  <span className="text-[11px] text-muted">{c.sku ?? ''} · shoda {Math.round(c.score * 100)} %</span>
                  <button type="button" className="btn btn-small btn-secondary" onClick={() => void onAction(() => api(`/admin/products/${p.id}/confirm-candidate`, { method: 'POST', body: { index: i } }))}>Potvrdit</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {(p.matchStatus === 'not_found' || !p.imageUrl) && (
          <div className="mt-2 flex flex-wrap gap-2">
            <input className="field !w-auto min-w-[260px]" type="url" placeholder="URL originální fotografie (ověřené)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
            <button type="button" className="btn btn-small btn-secondary" disabled={!imageUrl} onClick={() => void onAction(() => api(`/admin/products/${p.id}`, { method: 'PATCH', body: { imageUrl, showInLesson: true } }))}>Doplnit fotku</button>
            {!p.showInLesson && <button type="button" className="btn btn-small btn-secondary" onClick={() => void onAction(() => api(`/admin/products/${p.id}`, { method: 'PATCH', body: { showInLesson: true } }))}>Zobrazit v lekci bez fotky</button>}
          </div>
        )}
      </div>
    </li>
  );
}
