/**
 * Přesměrování z profilu dodavatele na první kapitolu.
 */
import { redirect } from 'next/navigation';

export default async function LearnSupplierPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/learn/${encodeURIComponent(slug)}/1`);
}
