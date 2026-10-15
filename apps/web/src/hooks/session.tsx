'use client';
/**
 * Kontext relace: vývojové přihlášení za studenta/správce a přepínání rolí.
 * Přepínač je jen pohodlí lokálního dema – oprávnění vždy kontroluje server podle tokenu.
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { devLogin, setTokenSource } from '@/api/client';
import type { Session, UserRole } from '@/api/types';

const STORAGE_KEY = 'valxon.session';

interface SessionContextValue {
  session: Session | null;
  role: UserRole;
  ready: boolean;
  error: string | null;
  switchRole: (role: UserRole) => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

/** Bezpečné čtení relace z localStorage (může být zakázané nebo poškozené). */
function readStored(): Session | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function store(session: Session | null): void {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Úložiště nedostupné – relace vydrží jen do reloadu.
  }
}

/** Poskytuje relaci celé aplikaci; při prvním načtení se přihlásí jako student. */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionRef = useRef<Session | null>(null);

  const login = useCallback(async (role: UserRole): Promise<Session | null> => {
    try {
      const next = await devLogin(role);
      sessionRef.current = next;
      setSession(next);
      store(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Přihlášení selhalo.');
      return null;
    }
  }, []);

  // Napojení API klienta na aktuální token + automatické obnovení při 401.
  useEffect(() => {
    setTokenSource({
      getToken: () => sessionRef.current?.token ?? null,
      refresh: async () => (await login(sessionRef.current?.user.role ?? 'student'))?.token ?? null,
    });
    const stored = readStored();
    if (stored) {
      sessionRef.current = stored;
      // localStorage je dostupný až po hydrataci; čtení v počátečním stavu by způsobilo SSR nesoulad.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSession(stored);
      setReady(true);
    } else {
      void login('student').finally(() => setReady(true));
    }
  }, [login]);

  const switchRole = useCallback(async (role: UserRole) => {
    await login(role);
  }, [login]);

  const value = useMemo<SessionContextValue>(
    () => ({ session, role: session?.user.role ?? 'student', ready, error, switchRole }),
    [session, ready, error, switchRole],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Přístup k relaci v komponentách. */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession musí být použit uvnitř SessionProvider.');
  return ctx;
}
