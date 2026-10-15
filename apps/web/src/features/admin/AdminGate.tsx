'use client';
/**
 * Brána správcovských obrazovek. Jde jen o UX (skrytí obrazovky studentovi) –
 * skutečnou ochranu zajišťuje server, který admin endpointy studentovi odmítne (403).
 */
import type { ReactNode } from 'react';
import { useSession } from '@/hooks/session';
import { Loading } from '@/components/StateViews';

export function AdminGate({ children }: { children: ReactNode }) {
  const { ready, role, switchRole } = useSession();
  if (!ready) return <Loading />;
  if (role !== 'admin') {
    return (
      <main className="mx-auto max-w-[700px] px-6 py-16">
        <h1 className="text-2xl font-bold text-dark">Tato část je jen pro správce obsahu.</h1>
        <p className="mt-2 text-muted">V lokálním demu můžeš přepnout vývojový účet na roli správce.</p>
        <button type="button" className="btn mt-5" onClick={() => void switchRole('admin')}>Přepnout na správce</button>
      </main>
    );
  }
  return <>{children}</>;
}
