'use client';
/**
 * „+ Přidat dodavatele“: název, URL webu, dokumenty, volitelný text a bestsellery od správce.
 * Po odeslání se dodavatel založí, nahrají se podklady a spustí se skutečný serverový import.
 */
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api, ApiError } from '@/api/client';
import type { AdminSupplier, ImportJob } from '@/api/types';
import { ErrorBox } from '@/components/StateViews';
import { AdminGate } from '@/features/admin/AdminGate';
import { parseBestsellers } from '@/features/admin/bestsellers';
import { FileDropzone } from '@/features/admin/FileDropzone';

export default function NewSupplierPage() {
  return (
    <AdminGate>
      <NewSupplierForm />
    </AdminGate>
  );
}

function NewSupplierForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [textTitle, setTextTitle] = useState('');
  const [text, setText] = useState('');
  const [bestsellersText, setBestsellersText] = useState('');
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | string | null>(null);

  const bestsellers = parseBestsellers(bestsellersText);
  const hasSource = websiteUrl.trim() || files.length > 0 || text.trim().length >= 20;

  /** Postupně: založení → nahrání souborů → text → spuštění importu. */
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    if (bestsellers.errors.length > 0) return setError(bestsellers.errors.join(' '));
    setError(null);
    try {
      setStep('Zakládám dodavatele…');
      const supplier = await api<AdminSupplier>('/admin/suppliers', {
        method: 'POST',
        body: { name: name.trim(), ...(websiteUrl.trim() ? { websiteUrl: websiteUrl.trim() } : {}), ...(bestsellers.items.length ? { bestsellers: bestsellers.items } : {}) },
      });
      if (files.length > 0) {
        setStep(`Nahrávám ${files.length} soubor(y)…`);
        const form = new FormData();
        files.forEach((f) => form.append('files', f));
        await api(`/admin/suppliers/${supplier.id}/sources/files`, { method: 'POST', formData: form });
      }
      if (text.trim().length >= 20) {
        setStep('Ukládám vložený text…');
        await api(`/admin/suppliers/${supplier.id}/sources/text`, { method: 'POST', body: { title: textTitle.trim() || 'Poznámky správce', text } });
      }
      setStep('Spouštím import…');
      await api<ImportJob>(`/admin/suppliers/${supplier.id}/imports`, { method: 'POST' });
      router.push(`/admin/suppliers/${supplier.id}?tab=import`);
    } catch (err) {
      setError(err instanceof ApiError ? err : 'Založení se nepodařilo.');
      setStep(null);
    }
  };

  return (
    <main className="mx-auto max-w-[860px] px-6 py-10 md:px-12">
      <span className="inline-block rounded-sm bg-rose-soft px-2.5 py-1.5 text-[10px] font-extrabold tracking-[1px] text-rose-dark">IMPORT DODAVATELE</span>
      <h1 className="mt-4 text-[34px] font-extrabold tracking-[-1px] text-dark">Přidat dodavatele</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Systém skutečně načte web a dokumenty, vytěží fakta s citacemi a připraví návrh sedmi kapitol. Nic se nepublikuje bez tvého schválení.
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-7">
        <div>
          <label htmlFor="name" className="field-label">Název dodavatele *</label>
          <input id="name" className="field" required minLength={2} maxLength={160} value={name} onChange={(e) => setName(e.target.value)} placeholder="např. Prodir" />
        </div>
        <div>
          <label htmlFor="url" className="field-label">Oficiální web dodavatele</label>
          <input id="url" type="url" className="field" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://www.dodavatel.com/" />
          <p className="mt-1 text-[11px] text-muted">Crawler respektuje robots.txt, načte nejvýše ~14 cílených podstránek (O nás, Produkty, Potisk, Dodání, FAQ, Kontakt…).</p>
        </div>
        <div>
          <span className="field-label">Dokumenty (katalog, ceník, podmínky)</span>
          <FileDropzone files={files} onChange={setFiles} />
        </div>
        <details className="rounded-lg border border-line px-4 py-3">
          <summary className="cursor-pointer text-[13px] font-bold text-dark">Vložit vlastní text (volitelné)</summary>
          <div className="mt-3 space-y-3">
            <input className="field" placeholder="Název, např. „Zápis ze schůzky 10. 10.“" value={textTitle} onChange={(e) => setTextTitle(e.target.value)} />
            <textarea className="field min-h-[120px]" placeholder="Text podkladu (min. 20 znaků)…" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
        </details>
        <div>
          <label htmlFor="bestsellers" className="field-label">TOP 10 bestsellerů (dodává správce)</label>
          <textarea
            id="bestsellers"
            className="field min-h-[130px] font-mono text-[12px]"
            value={bestsellersText}
            onChange={(e) => setBestsellersText(e.target.value)}
            placeholder={'Jeden produkt na řádek: Název | SKU | URL\nnapř. DS4 Ballpoint | DS4 | https://www.dodavatel.com/products/ds4'}
          />
          <p className="mt-1 text-[11px] text-muted">
            Systém bestsellery nikdy nevybírá sám. Bez seznamu bude kapitola 4 „Reprezentativní výběr produktů“.
            {bestsellers.items.length > 0 && ` Rozpoznáno: ${bestsellers.items.length}.`}
          </p>
          {bestsellers.errors.length > 0 && <p className="mt-1 text-[12px] text-rose-dark">{bestsellers.errors.join(' ')}</p>}
        </div>

        {error && <ErrorBox error={error} />}

        <div className="flex flex-wrap items-center gap-4 border-t border-line pt-6">
          <button type="submit" className="btn" disabled={!name.trim() || !hasSource || step !== null}>
            {step ?? 'Načíst a vytvořit návrh'}
          </button>
          {!hasSource && <span className="text-[12px] text-muted">Zadej web, nahraj dokument nebo vlož text.</span>}
        </div>
      </form>
    </main>
  );
}
