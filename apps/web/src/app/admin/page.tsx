'use client';
/**
 * Přehled správy obsahu: všichni dodavatelé včetně konceptů a stavu publikace.
 */
import Link from 'next/link';
import type { AdminSupplier } from '@/api/types';
import { AdminGate } from '@/features/admin/AdminGate';
import { StatusBadge } from '@/components/StatusBadge';
import { Empty, ErrorBox, Loading } from '@/components/StateViews';
import { useApi } from '@/hooks/use-api';

export default function AdminHomePage() {
  return (
    <AdminGate>
      <AdminSupplierList />
    </AdminGate>
  );
}

function AdminSupplierList() {
  const { data, error, loading } = useApi<AdminSupplier[]>('/admin/suppliers');
  return (
    <main className="mx-auto max-w-[1100px] px-6 py-10 md:px-12">
      <span className="inline-block rounded-sm bg-rose-soft px-2.5 py-1.5 text-[10px] font-extrabold tracking-[1px] text-rose-dark">SPRÁVA OBSAHU</span>
      <div className="mt-4 mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[34px] font-extrabold tracking-[-1px] text-dark">Dodavatelé</h1>
          <p className="mt-1 max-w-[620px] text-[14px] text-muted">Import podkladů → ověření faktů → schválení kapitol a otázek → publikace. Student uvidí jen publikovaný a schválený obsah.</p>
        </div>
        <Link href="/admin/new" className="btn">＋ Přidat dodavatele</Link>
      </div>

      {loading && <Loading />}
      {error && <ErrorBox error={error} />}
      {data?.length === 0 && <Empty title="Zatím žádní dodavatelé.">Začni tlačítkem „Přidat dodavatele“.</Empty>}
      {data && data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="bg-[#f5f6f8] text-[10px] tracking-[0.5px] text-[#69707a] uppercase">
              <tr>
                <th className="px-4 py-3">Dodavatel</th>
                <th className="px-4 py-3">Web</th>
                <th className="px-4 py-3">Stav</th>
                <th className="px-4 py-3">Publikováno</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} className="border-t border-[#eceef1]">
                  <td className="px-4 py-3.5 font-bold text-dark">{s.name}</td>
                  <td className="max-w-[260px] truncate px-4 py-3.5 text-muted">{s.websiteUrl ?? '—'}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3.5 text-muted">{s.publishedAt ? new Date(s.publishedAt).toLocaleString('cs-CZ') : '—'}</td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/admin/suppliers/${s.id}`} className="btn btn-small btn-secondary">Spravovat</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
