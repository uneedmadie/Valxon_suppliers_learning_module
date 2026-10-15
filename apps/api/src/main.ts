/**
 * Vstupní bod API VALXON Academy.
 */
import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { AppConfig } from './config/app-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  const config = app.get(AppConfig);
  await app.listen(config.port);
  Logger.log(`API běží na http://localhost:${config.port}/api (data: ${config.dataDir})`, 'Bootstrap');
  if (config.devLoginEnabled) Logger.warn('Zapnuté VÝVOJOVÉ přihlášení bez hesla – pouze pro lokální demo.', 'Bootstrap');
}

void bootstrap();
