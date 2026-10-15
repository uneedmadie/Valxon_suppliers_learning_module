/**
 * Bezpečný HTTP klient importéru: validace URL, SSRF ochrana při každém připojení,
 * ruční přesměrování s opakovanou kontrolou, časové limity a limit velikosti odpovědi.
 * Nic nepředstírá – každé selhání vrací srozumitelný důvod pro report správci.
 */
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { lookup as dnsLookup, LookupAddress } from 'node:dns';
import { isIP, LookupFunction } from 'node:net';
import { getCACertificates, rootCertificates } from 'node:tls';
import { Agent, request } from 'undici';
import { AppConfig } from '../../../config/app-config';
import { isBlockedAddress } from './network-guard';

/** Identifikace importéru vůči cílovým webům (kvůli transparentnosti a robots.txt). */
export const IMPORTER_USER_AGENT = 'ValxonAcademyImporter/0.1 (+internal supplier learning tool; respects robots.txt)';

const MAX_REDIRECTS = 5;

/** Výsledek úspěšného stažení. */
export interface FetchResult {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  body: Buffer;
}

/** Chyba stažení s důvodem srozumitelným pro správce. */
export class FetchError extends Error {
  constructor(
    message: string,
    readonly url: string,
    readonly code: 'invalid_url' | 'blocked_address' | 'timeout' | 'too_large' | 'http_error' | 'network' | 'too_many_redirects',
    readonly status?: number,
  ) {
    super(message);
  }
}

/** Parametry jednoho požadavku. */
export interface FetchOptions {
  maxBytes: number;
  accept?: string;
}

/**
 * Ověří tvar URL pro import: pouze http(s), bez přihlašovacích údajů v URL,
 * bez IP literálů do privátních sítí.
 * @throws FetchError s kódem `invalid_url` nebo `blocked_address`
 */
export function assertImportableUrl(raw: string, allowPrivate: boolean): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError('Neplatná URL adresa.', raw, 'invalid_url');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new FetchError('Povolené jsou jen adresy http(s).', raw, 'invalid_url');
  }
  if (url.username || url.password) {
    throw new FetchError('URL nesmí obsahovat přihlašovací údaje.', raw, 'invalid_url');
  }
  // IP literál se nepřekládá přes DNS, proto ho kontrolujeme hned zde.
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (!allowPrivate && isIP(host) && isBlockedAddress(host)) {
    throw new FetchError('Adresa míří do privátní nebo rezervované sítě (ochrana SSRF).', raw, 'blocked_address');
  }
  if (!allowPrivate && (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local'))) {
    throw new FetchError('Lokální adresy nejsou pro import povolené (ochrana SSRF).', raw, 'blocked_address');
  }
  return url;
}

/**
 * Důvěryhodné certifikační autority: vestavěné v Node.js + systémové úložiště OS.
 * Systémové úložiště (Windows) často obsahuje mezilehlé certifikáty, které některé weby
 * dodavatelů neposílají. Ověřování TLS zůstává vždy zapnuté – jen rozšiřujeme seznam důvěryhodných CA.
 */
function trustedCertificates(): string[] {
  const bundled = [...rootCertificates];
  try {
    return [...new Set([...bundled, ...getCACertificates('system')])];
  } catch {
    return bundled;
  }
}

/** TLS chyby, u kterých je potřeba správci vysvětlit, proč web nelze bezpečně načíst. */
const TLS_ERROR_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'CERT_HAS_EXPIRED',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'ERR_TLS_CERT_ALTNAME_INVALID',
]);

/** HTTP klient s bezpečnostními limity. */
@Injectable()
export class SafeHttpClient implements OnModuleDestroy {
  private readonly agent: Agent;

  constructor(private readonly config: AppConfig) {
    // Vlastní DNS lookup ověřuje KAŽDOU adresu v okamžiku připojení (i po přesměrování).
    const allowPrivate = config.importAllowPrivateHosts;
    const guardedLookup: LookupFunction = (hostname, options, callback) => {
      dnsLookup(hostname, { ...options, all: true }, (err, addresses: LookupAddress[]) => {
        if (err) return callback(err, '', 0);
        const list = Array.isArray(addresses) ? addresses : [];
        const blocked = !allowPrivate && list.some((a) => isBlockedAddress(a.address));
        if (blocked || list.length === 0) {
          const error = Object.assign(new Error(`Blokovaná cílová adresa pro ${hostname} (ochrana SSRF).`), { code: 'EBLOCKED' });
          return callback(error, '', 0);
        }
        if (options.all) return callback(null, list, 0);
        const first = list[0];
        return callback(null, first.address, first.family);
      });
    };
    this.agent = new Agent({
      connect: { lookup: guardedLookup, timeout: config.importTimeoutMs, ca: trustedCertificates() },
      headersTimeout: config.importTimeoutMs,
      bodyTimeout: config.importTimeoutMs,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.agent.close();
  }

  /**
   * Stáhne URL s ručně řízeným přesměrováním a limitem velikosti.
   * @throws FetchError při jakémkoli selhání (včetně HTTP 4xx/5xx).
   */
  async fetch(rawUrl: string, options: FetchOptions): Promise<FetchResult> {
    let current = assertImportableUrl(rawUrl, this.config.importAllowPrivateHosts);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const signal = AbortSignal.timeout(this.config.importTimeoutMs * 2);
      let response: Awaited<ReturnType<typeof request>>;
      try {
        response = await request(current, {
          method: 'GET',
          dispatcher: this.agent,
          signal,
          headers: {
            'user-agent': IMPORTER_USER_AGENT,
            accept: options.accept ?? 'text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.5',
            'accept-language': 'en,cs;q=0.9,de;q=0.6,nl;q=0.5',
          },
        });
      } catch (error) {
        throw this.toFetchError(error, current.toString());
      }

      // Přesměrování: novou cílovou URL znovu validujeme (protokol, IP literál) a pokračujeme.
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        await response.body.dump();
        const location = Array.isArray(response.headers.location) ? response.headers.location[0] : response.headers.location;
        current = assertImportableUrl(new URL(location ?? '', current).toString(), this.config.importAllowPrivateHosts);
        continue;
      }

      if (response.statusCode >= 400) {
        await response.body.dump();
        throw new FetchError(`Server odpověděl HTTP ${response.statusCode}.`, current.toString(), 'http_error', response.statusCode);
      }

      // Čtení těla po částech s tvrdým limitem velikosti (ochrana paměti).
      const contentLength = Number(response.headers['content-length'] ?? 0);
      if (contentLength > options.maxBytes) {
        await response.body.dump();
        throw new FetchError(`Odpověď je větší než povolený limit ${Math.round(options.maxBytes / 1048576)} MB.`, current.toString(), 'too_large');
      }
      const chunks: Buffer[] = [];
      let total = 0;
      try {
        for await (const chunk of response.body) {
          const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
          total += buf.length;
          if (total > options.maxBytes) {
            response.body.destroy();
            throw new FetchError(`Odpověď překročila limit ${Math.round(options.maxBytes / 1048576)} MB.`, current.toString(), 'too_large');
          }
          chunks.push(buf);
        }
      } catch (error) {
        if (error instanceof FetchError) throw error;
        throw this.toFetchError(error, current.toString());
      }

      const contentType = String(response.headers['content-type'] ?? '').toLowerCase();
      return { requestedUrl: rawUrl, finalUrl: current.toString(), status: response.statusCode, contentType, body: Buffer.concat(chunks) };
    }
    throw new FetchError('Příliš mnoho přesměrování.', rawUrl, 'too_many_redirects');
  }

  /** Převede nízkoúrovňovou síťovou chybu na srozumitelnou FetchError. */
  private toFetchError(error: unknown, url: string): FetchError {
    if (error instanceof FetchError) return error;
    const message = error instanceof Error ? error.message : String(error);
    // undici často balí původní síťovou chybu do `cause` – kód hledáme v obou úrovních.
    const codeOf = (e: unknown): string => (typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '');
    const cause = error instanceof Error ? error.cause : undefined;
    const code = codeOf(error) || codeOf(cause);
    if (TLS_ERROR_CODES.has(code)) {
      return new FetchError(`Certifikát HTTPS webu se nepodařilo ověřit (${code}). Import byl z bezpečnostních důvodů zastaven – nahrajte podklady jako PDF/DOCX/XLSX.`, url, 'network');
    }
    if (code === 'EBLOCKED' || message.includes('ochrana SSRF')) {
      return new FetchError('Cílová adresa se překládá do privátní sítě (ochrana SSRF).', url, 'blocked_address');
    }
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError' || code.includes('TIMEOUT'))) {
      return new FetchError('Vypršel časový limit požadavku.', url, 'timeout');
    }
    if (code === 'ENOTFOUND') return new FetchError('Doménu se nepodařilo najít (DNS).', url, 'network');
    return new FetchError(`Síťová chyba: ${message}`, url, 'network');
  }
}
