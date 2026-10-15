/**
 * HTTP klient REST API. Přidává Bearer token, převádí chyby na `ApiError`
 * se srozumitelnou českou zprávou a při vypršení vývojového přihlášení se jednou znovu přihlásí.
 */
import type { Session, UserRole } from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Chyba volání API s HTTP stavem a případným seznamem problémů (např. kontrola publikace). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly problems: string[] = [],
  ) {
    super(message);
  }
}

/** Poskytovatel tokenu – nastavuje ho SessionProvider. */
interface TokenSource {
  getToken: () => string | null;
  refresh: () => Promise<string | null>;
}

let tokenSource: TokenSource = { getToken: () => null, refresh: async () => null };

/** Registrace zdroje tokenu (volá SessionProvider při inicializaci). */
export function setTokenSource(source: TokenSource): void {
  tokenSource = source;
}

/** Vytáhne z chybové odpovědi Nest čitelnou zprávu a seznam problémů. */
async function toApiError(response: Response): Promise<ApiError> {
  let message = `Požadavek selhal (HTTP ${response.status}).`;
  let problems: string[] = [];
  try {
    const data: unknown = await response.json();
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      if (typeof record.message === 'string') message = record.message;
      else if (Array.isArray(record.message)) message = record.message.filter((m): m is string => typeof m === 'string').join(' ');
      if (Array.isArray(record.problems)) problems = record.problems.filter((p): p is string => typeof p === 'string');
    }
  } catch {
    // Odpověď bez JSON těla – ponecháme obecnou zprávu.
  }
  return new ApiError(message, response.status, problems);
}

/** Volitelné parametry požadavku. */
interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  formData?: FormData;
}

/**
 * Zavolá API a vrátí rozparsovaný JSON.
 * @throws ApiError při chybě sítě nebo HTTP stavu >= 400
 */
export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenSource.getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (options.formData) body = options.formData;
  else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api${path}`, { method: options.method ?? 'GET', headers, body, cache: 'no-store' });
  } catch {
    throw new ApiError('API není dostupné. Běží backend (npm run dev)?', 0);
  }

  // Vypršelý nebo neplatný token (např. po smazání DB): jednou obnovit přihlášení a zopakovat.
  if (response.status === 401 && !retried) {
    const refreshed = await tokenSource.refresh();
    if (refreshed) return api<T>(path, options, true);
  }
  if (!response.ok) throw await toApiError(response);
  return (await response.json()) as T;
}

/** Vývojové přihlášení za roli (jen lokální demo). */
export function devLogin(role: UserRole): Promise<Session> {
  return api<Session>('/auth/dev-login', { method: 'POST', body: { role } }, true);
}
