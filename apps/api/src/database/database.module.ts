/**
 * Databázový modul: SQLite přes TypeORM (better-sqlite3).
 * Schéma se nikdy nesynchronizuje automaticky – spouští se verzované migrace,
 * aby lokální data (publikovaní dodavatelé, progres) přežila restart i změny kódu.
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AppConfig } from '../config/app-config';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => {
        // Adresář pro DB musí existovat dřív, než ho better-sqlite3 otevře.
        if (config.databasePath !== ':memory:') mkdirSync(dirname(config.databasePath), { recursive: true });
        return {
          type: 'better-sqlite3' as const,
          database: config.databasePath,
          entities: ENTITIES,
          migrations: MIGRATIONS,
          migrationsRun: true,
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
