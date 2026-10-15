/**
 * Typovaná konfigurace API načítaná z proměnných prostředí (`.env` lokálně).
 * Jediné místo, kde se čtou env proměnné – zbytek aplikace dostává hotový objekt přes DI.
 */
import { Global, Module } from '@nestjs/common';
import { resolve } from 'node:path';

/** Převede textovou env hodnotu na boolean s výchozí hodnotou. */
function readBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value.trim() === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

/** Převede textovou env hodnotu na kladné celé číslo s výchozí hodnotou. */
function readInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Neměnná konfigurace aplikace.
 * Hodnoty bezpečnostních přepínačů mají bezpečné výchozí nastavení (privátní adresy zakázány, AI vypnutá).
 */
export class AppConfig {
  readonly port: number;
  /** Adresář pro SQLite databázi, nahrané soubory a lokální tajemství (gitignored). */
  readonly dataDir: string;
  readonly databasePath: string;
  readonly webOrigin: string;
  /** Tajemství pro podpis tokenů; pokud chybí, AuthService si vygeneruje lokální soubor. */
  readonly authSecret: string | null;
  /** Vývojové přihlášení bez hesla – jen pro lokální demo, nikoli produkční ochrana. */
  readonly devLoginEnabled: boolean;
  /** Povolit import z localhost/privátních IP – výhradně pro automatické testy. */
  readonly importAllowPrivateHosts: boolean;
  readonly importMaxPages: number;
  readonly importRequestDelayMs: number;
  readonly importTimeoutMs: number;
  readonly uploadMaxBytes: number;
  /** Název schváleného AI poskytovatele; prázdné = AI krok není zprovozněn. */
  readonly aiProvider: string | null;
  /** Výslovné schválení VALXON pro posílání podkladů externímu AI. */
  readonly aiProviderApproved: boolean;

  constructor(env: NodeJS.ProcessEnv) {
    this.port = readInt(env.PORT ?? env.API_PORT, 4000);
    this.dataDir = resolve(env.DATA_DIR ?? './storage');
    this.databasePath = env.DATABASE_PATH ?? resolve(this.dataDir, 'valxon.sqlite');
    this.webOrigin = env.WEB_ORIGIN ?? 'http://localhost:3000';
    this.authSecret = env.AUTH_SECRET?.trim() ? env.AUTH_SECRET.trim() : null;
    this.devLoginEnabled = readBool(env.DEV_LOGIN_ENABLED, true);
    this.importAllowPrivateHosts = readBool(env.IMPORT_ALLOW_PRIVATE_HOSTS, false);
    this.importMaxPages = readInt(env.IMPORT_MAX_PAGES, 14);
    this.importRequestDelayMs = Number.parseInt(env.IMPORT_REQUEST_DELAY_MS ?? '', 10) >= 0
      ? Number.parseInt(env.IMPORT_REQUEST_DELAY_MS ?? '400', 10)
      : 400;
    this.importTimeoutMs = readInt(env.IMPORT_TIMEOUT_MS, 15000);
    this.uploadMaxBytes = readInt(env.UPLOAD_MAX_MB, 25) * 1024 * 1024;
    this.aiProvider = env.AI_PROVIDER?.trim() ? env.AI_PROVIDER.trim() : null;
    this.aiProviderApproved = readBool(env.AI_PROVIDER_APPROVED, false);
  }
}

/** Globální modul zpřístupňující `AppConfig` všem službám. */
@Global()
@Module({
  providers: [{ provide: AppConfig, useFactory: () => new AppConfig(process.env) }],
  exports: [AppConfig],
})
export class AppConfigModule {}
