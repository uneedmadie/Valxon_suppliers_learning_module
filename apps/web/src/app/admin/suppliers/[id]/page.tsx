'use client';
/**
 * Review workspace dodavatele: záložky Import a zdroje / Fakta / Kapitoly a otázky /
 * Produkty / Profil a publikace. Aktivní záložka je v URL (?tab=…), aby přežila reload.
 */
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import type { AdminSupplier } from '@/api/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ErrorBox, Loading } from '@/components/StateViews';
import { AdminGate } from '@/features/admin/AdminGate';
import { ChaptersTab } from '@/features/admin/ChaptersTab';
import { FactsTab } from '@/features/admin/FactsTab';
import { ImportTab } from '@/features/admin/ImportTab';
import { ProductsTab } from '@/features/admin/ProductsTab';
import { PublishTab } from '@/features/admin/PublishTab';
import { useApi } from '@/hooks/use-api';

const TABS = [
  { id: 'import', label: 'Import a zdroje' },
  { id: 'facts', label: 'Fakta a citace' },
  { id: 'chapters', label: 'Kapitoly a otázky' },
  { id: 'products', label: 'Produkty' },
  { id: 'publish', label: 'Profil a publikace' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function SupplierWorkspacePage() {
  return (
    <AdminGate>
      <Suspense fallback={<Loading />}>
        <Workspace />
      </Suspense>
    </AdminGate>
  );
}

function Workspace() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : 'import';
  const supplier = useApi<AdminSupplier>(`/admin/suppliers/${id}`);
  const reloadSupplier = supplier.reload;
  const onImported = useCallback(() => void reloadSupplier(), [reloadSupplier]);

  if (supplier.loading && !supplier.data) return <Loading />;
  if (supplier.error) return <div className="mx-auto max-w-[900px] p-8"><ErrorBox error={supplier.error} /></div>;
  const s = supplier.data;
  if (!s) return null;

  return (
    <main className="mx-auto max-w-[1240px] px-5 py-8 md:px-10">
      <Link href="/admin" className="text-[11px] font-bold text-muted hover:text-rose">← Všichni dodavatelé</Link>
      <div className="mt-3 mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-[34px] font-extrabold tracking-[-1px] text-dark">{s.name}</h1>
        <StatusBadge status={s.status} />
        <div className="ml-auto flex gap-2">
          <Link href={`/admin/suppliers/${s.id}/preview/1`} className="btn btn-secondary">Studentský náhled</Link>
          {s.status === 'published' && <Link href={`/learn/${s.slug}/1`} className="btn btn-dark">Otevřít v katalogu</Link>}
        </div>
      </div>

      <nav className="mb-8 flex gap-1 overflow-x-auto border-b border-line" aria-label="Části review">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => router.replace(`/admin/suppliers/${s.id}?tab=${t.id}`)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`-mb-px border-b-2 px-4 py-3 text-[13px] font-bold whitespace-nowrap ${tab === t.id ? 'border-rose text-rose-dark' : 'border-transparent text-muted hover:text-dark'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'import' && <ImportTab supplierId={s.id} onImported={onImported} />}
      {tab === 'facts' && <FactsTab supplierId={s.id} />}
      {tab === 'chapters' && <ChaptersTab supplierId={s.id} />}
      {tab === 'products' && <ProductsTab supplierId={s.id} />}
      {tab === 'publish' && <PublishTab supplier={s} onChanged={(next) => supplier.setData(next)} />}
    </main>
  );
}
