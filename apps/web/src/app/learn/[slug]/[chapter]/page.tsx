'use client';
/**
 * Studentská stránka kapitoly: načte publikovaný profil dodavatele a zobrazí zvolenou kapitolu.
 */
import { useParams } from 'next/navigation';
import type { LearnSupplier } from '@/api/types';
import { ErrorBox, Loading } from '@/components/StateViews';
import { applyAnswer } from '@/features/learn/apply-answer';
import { ChapterView } from '@/features/learn/ChapterView';
import { useApi } from '@/hooks/use-api';

export default function LearnChapterPage() {
  const params = useParams<{ slug: string; chapter: string }>();
  const chapterNumber = Math.min(7, Math.max(1, Number(params.chapter) || 1));
  const { data, error, loading, setData } = useApi<LearnSupplier>(`/learn/suppliers/${encodeURIComponent(params.slug)}`);

  if (loading && !data) return <div className="px-8"><Loading /></div>;
  if (error) return <div className="mx-auto max-w-[800px] px-6 py-10"><ErrorBox error={error} /></div>;
  if (!data) return null;
  return (
    <ChapterView
      supplier={data}
      chapterNumber={chapterNumber}
      basePath={`/learn/${data.slug}`}
      onAnswered={(chapterId, response) => setData(applyAnswer(data, chapterId, response))}
    />
  );
}
