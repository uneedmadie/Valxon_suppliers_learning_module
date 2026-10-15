/**
 * DTO vývojového přihlášení a odpovědi s relací.
 */
import { IsIn } from 'class-validator';
import type { UserRole } from '../../users/entities/user.entity';
import type { AuthUser } from '../auth.decorators';

/** Požadavek na vývojové přihlášení za roli. */
export class DevLoginDto {
  @IsIn(['admin', 'student'])
  role!: UserRole;
}

/** Odpověď s tokenem a identitou. */
export class SessionResponseDto {
  token!: string;
  user!: AuthUser;
  /** Vždy pravdivě uvádí, že jde o vývojové přihlášení. */
  mode!: 'development';
}
