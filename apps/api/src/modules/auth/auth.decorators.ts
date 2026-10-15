/**
 * Dekorátory autentizace a autorizace: veřejné endpointy, požadovaná role a aktuální uživatel.
 */
import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Request } from 'express';
import type { UserRole } from '../users/entities/user.entity';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Identita přihlášeného uživatele odvozená z ověřeného tokenu. */
export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
}

/** Požadavek Express rozšířený o ověřeného uživatele. */
export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

/** Označí endpoint jako přístupný bez přihlášení. */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);

/** Omezí endpoint/kontroler na vyjmenované role (kontrola probíhá na serveru). */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);

/** Vloží do parametru handleru aktuálního ověřeného uživatele. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  if (!request.user) throw new Error('CurrentUser použit na veřejném endpointu bez přihlášení.');
  return request.user;
});
