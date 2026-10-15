/**
 * REST kontroler autentizace: vývojové přihlášení a informace o aktuálním uživateli.
 */
import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthUser, CurrentUser, Public } from './auth.decorators';
import { AuthService } from './auth.service';
import { DevLoginDto, SessionResponseDto } from './dto/dev-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Vývojové přihlášení za studenta nebo správce (lokální demo). */
  @Public()
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(@Body() dto: DevLoginDto): Promise<SessionResponseDto> {
    const { token, user } = await this.auth.devLogin(dto.role);
    return { token, user, mode: 'development' };
  }

  /** Vrátí identitu podle tokenu. */
  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
