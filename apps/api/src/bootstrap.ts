/**
 * Společná konfigurace Nest aplikace (prefix /api, validace DTO, CORS, bezpečnostní hlavičky).
 * Používá ji `main.ts` i end-to-end testy, aby testy ověřovaly stejné chování jako produkční běh.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { AppConfig } from './config/app-config';

/** Aplikuje globální nastavení na vytvořenou Nest aplikaci. */
export function configureApp(app: INestApplication): void {
  const config = app.get(AppConfig);
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  // Validace: neznámá pole se odmítají, typy se převádějí podle DTO.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  // Frontend volá API přes Next.js proxy; CORS povolujeme jen pro jeho origin.
  app.enableCors({ origin: config.webOrigin, credentials: false });
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    next();
  });
}
