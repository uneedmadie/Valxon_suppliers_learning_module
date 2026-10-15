'use client';
/**
 * Studentský náhled pro správce – stejné filtrování obsahu jako u studenta, bez nutnosti publikace.
 */
import { useParams } from 'next/navigation';
import type { LearnSupplier } from '@/api/types';
import { ErrorBox, Loading } from '@/components/StateViews';
import { AdminGate } from '@/features/admin/AdminGate';
import { ChapterView } from '@/features/learn/ChapterView';
import { useApi } from '@/hooks/use-api';

export default function PreviewPage() {
  return (
    <AdminGate>
      <Preview />
    </AdminGate>
  );
}

function Preview() {
  const params = useParams<{ id: string; chapter: string }>();
  const { data, error, loading } = useApi<LearnSupplier>(`/admin/suppliers/${params.id}/preview`);
  if (loading && !data) return <div className="px-8"><Loading /></div>;
  if (error) return <div className="mx-auto max-w-[800px] px-6 py-10"><ErrorBox error={error} /></div>;
  if (!data) return null;
  return <ChapterView supplier={data} chapterNumber={Number(params.chapter) || 1} basePath={`/admin/suppliers/${params.id}/preview`} onAnswered={() => undefined} />;
}
