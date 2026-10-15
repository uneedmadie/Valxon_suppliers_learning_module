'use client';
/**
 * Hook pro načtení dat z API se stavy loading/error a možností znovunačtení.
 * Čeká na připravenou relaci, aby první požadavek neodešel bez tokenu.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/api/client';
import { useSession } from './session';

export interface ApiState<T> {
  data: T | null;
  error: ApiError | null;
  loading: boolean;
  reload: () => Promise<void>;
  setData: (data: T) => void;
}

const toApiError = (e: unknown): ApiError => (e instanceof ApiError ? e : new ApiError(String(e), 0));

/**
 * Načte `path` (nebo nic, pokud je `null`). Znovu načítá při změně cesty nebo role.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const { ready, role } = useSession();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);

  // Automatické načtení: stav se mění až v asynchronních callbacích; zrušený požadavek se ignoruje.
  useEffect(() => {
    if (!path || !ready) return;
    let cancelled = false;
    api<T>(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(toApiError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Role je v závislostech záměrně: po přepnutí role se data načtou s novým oprávněním.
  }, [path, ready, role]);

  /** Ruční znovunačtení (po akci správce). */
  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setLoading(false);
    }
  }, [path]);

  return { data, error, loading, reload, setData };
}
