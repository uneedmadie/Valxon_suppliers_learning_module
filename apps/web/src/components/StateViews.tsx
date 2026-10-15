/**
 * Jednotné stavy obrazovek: načítání, chyba a prázdný stav.
 */
import type { ReactNode } from 'react';
import type { ApiError } from '@/api/client';

export function Loading({ label = 'Načítám…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 py-16 text-sm text-muted" role="status">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-rose" aria-hidden />
      {label}
    </div>
  );
}

export function ErrorBox({ error, children }: { error: ApiError | Error | string; children?: ReactNode }) {
  const message = typeof error === 'string' ? error : error.message;
  const problems = typeof error === 'object' && 'problems' in error ? error.problems : [];
  return (
    <div className="my-4 border-l-4 border-rose bg-rose-soft px-5 py-4 text-sm text-[#3d4046]" role="alert">
      <b className="mb-1 block text-rose-dark">{message}</b>
      {problems.length > 0 && (
        <ul className="ml-5 list-disc text-[13px] leading-7">
          {problems.map((p) => <li key={p}>{p}</li>)}
        </ul>
      )}
      {children}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border-l-[3px] border-[#a7acb5] bg-pale px-5 py-4 text-[13px] text-[#68707b]">
      <b className="mb-1 block text-dark">{title}</b>
      {children}
    </div>
  );
}
