/**
 * Data source pro TypeORM CLI (generování a ruční spouštění migrací).
 * Aplikace sama spouští migrace při startu (viz `database.module.ts`).
 */
import 'reflect-metadata';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DataSource } from 'typeorm';
import { AppConfig } from '../config/app-config';
import { ENTITIES } from './entities';
import { MIGRATIONS } from './migrations';

const config = new AppConfig(process.env);
mkdirSync(dirname(config.databasePath), { recursive: true });

export default new DataSource({
  type: 'better-sqlite3',
  database: config.databasePath,
  entities: ENTITIES,
  migrations: MIGRATIONS,
});
