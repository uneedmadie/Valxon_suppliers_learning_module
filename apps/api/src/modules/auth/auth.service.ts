/**
 * Služba autentizace: vydává a ověřuje HMAC podepsané tokeny.
 * V lokálním demu umožňuje vývojové přihlášení podle role – to je výslovně
 * vývojová pomůcka, nikoli produkční ochrana (žádná hesla, žádné SSO).
 */
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AppConfig } from '../../config/app-config';
import type { UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import type { AuthUser } from './auth.decorators';

/** Platnost tokenu – 12 hodin. */
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

interface TokenPayload {
  sub: string;
  role: UserRole;
  exp: number;
}

/** Vydávání a ověřování přístupových tokenů. */
@Injectable()
export class AuthService {
  private readonly secret: Buffer;

  constructor(
    private readonly config: AppConfig,
    private readonly users: UsersService,
  ) {
    this.secret = this.loadSecret();
  }

  /**
   * Vývojové přihlášení za danou roli.
   * @throws ForbiddenException pokud je vývojové přihlášení vypnuté (`DEV_LOGIN_ENABLED=false`).
   */
  async devLogin(role: UserRole): Promise<{ token: string; user: AuthUser }> {
    if (!this.config.devLoginEnabled) {
      throw new ForbiddenException('Vývojové přihlášení je vypnuté.');
    }
    const user = await this.users.findDevUserByRole(role);
    if (!user) throw new UnauthorizedException('Vývojový účet nebyl nalezen.');
    const payload: TokenPayload = { sub: user.id, role: user.role, exp: Date.now() + TOKEN_TTL_MS };
    return { token: this.sign(payload), user: { id: user.id, role: user.role, name: user.name } };
  }

  /**
   * Ověří podpis a platnost tokenu a dohledá uživatele v DB
   * (role se bere z DB, ne z tokenu, aby změna role platila okamžitě).
   */
  async verify(token: string): Promise<AuthUser> {
    const [body, signature] = token.split('.');
    if (!body || !signature) throw new UnauthorizedException('Neplatný token.');

    // Porovnání podpisu v konstantním čase brání časovým útokům.
    const expected = Buffer.from(this.hmac(body), 'base64url');
    const given = Buffer.from(signature, 'base64url');
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      throw new UnauthorizedException('Neplatný podpis tokenu.');
    }

    const payload = this.parsePayload(body);
    if (payload.exp < Date.now()) throw new UnauthorizedException('Platnost přihlášení vypršela.');

    const user = await this.users.findById(payload.sub);
    if (!user) throw new UnauthorizedException('Uživatel neexistuje.');
    return { id: user.id, role: user.role, name: user.name };
  }

  private sign(payload: TokenPayload): string {
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${this.hmac(body)}`;
  }

  private hmac(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }

  /** Bezpečně rozparsuje payload tokenu a zúží jeho typ. */
  private parsePayload(body: string): TokenPayload {
    try {
      const raw: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
      if (
        typeof raw === 'object' && raw !== null &&
        'sub' in raw && typeof raw.sub === 'string' &&
        'role' in raw && (raw.role === 'admin' || raw.role === 'student') &&
        'exp' in raw && typeof raw.exp === 'number'
      ) {
        return { sub: raw.sub, role: raw.role, exp: raw.exp };
      }
    } catch {
      // Poškozený JSON se níže převede na 401.
    }
    throw new UnauthorizedException('Neplatný obsah tokenu.');
  }

  /**
   * Načte tajemství z konfigurace; pokud chybí, vytvoří lokální náhodné tajemství
   * v datovém adresáři (gitignored), aby tokeny přežily restart serveru.
   */
  private loadSecret(): Buffer {
    if (this.config.authSecret) return Buffer.from(this.config.authSecret, 'utf8');
    const secretPath = join(this.config.dataDir, '.auth-secret');
    if (existsSync(secretPath)) return Buffer.from(readFileSync(secretPath, 'utf8').trim(), 'hex');
    mkdirSync(this.config.dataDir, { recursive: true });
    const generated = randomBytes(32);
    writeFileSync(secretPath, generated.toString('hex'), { mode: 0o600 });
    return generated;
  }
}
