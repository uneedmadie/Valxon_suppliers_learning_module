/**
 * Globální guard: každý endpoint vyžaduje platný Bearer token, pokud není označen `@Public()`,
 * a pokud deklaruje `@Roles(...)`, ověří roli uživatele. Role se tedy kontroluje na serveru.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '../users/entities/user.entity';
import { AuthenticatedRequest, IS_PUBLIC_KEY, ROLES_KEY } from './auth.decorators';
import { AuthService } from './auth.service';

/** Autentizace + autorizace podle rolí. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    // Token se čte výhradně z hlavičky Authorization (žádné cookies → žádné CSRF).
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
    if (!token) throw new UnauthorizedException('Chybí přihlášení.');
    request.user = await this.auth.verify(token);

    // Autorizace podle role deklarované na handleru nebo kontroleru.
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, targets);
    if (roles && !roles.includes(request.user.role)) {
      throw new ForbiddenException('Na tuto akci nemáte oprávnění.');
    }
    return true;
  }
}
