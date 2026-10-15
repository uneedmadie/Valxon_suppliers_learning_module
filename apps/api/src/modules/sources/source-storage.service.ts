/**
 * Lokální úložiště nahraných podkladů (`<DATA_DIR>/uploads/<supplierId>/`).
 * Soubory dostávají náhodné názvy – původní název se ukládá jen do DB pro správce,
 * takže nehrozí path traversal ani kolize. Úložiště je mimo Git (`.gitignore`).
 */
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { AppConfig } from '../../config/app-config';

/** Ukládání a čtení nahraných souborů. */
@Injectable()
export class SourceStorageService {
  constructor(private readonly config: AppConfig) {}

  /** Uloží obsah a vrátí vygenerovaný název souboru. */
  async save(supplierId: string, extension: string, data: Buffer): Promise<string> {
    const dir = this.dirFor(supplierId);
    await mkdir(dir, { recursive: true });
    const fileName = `${randomUUID()}.${extension.replace(/[^a-z0-9]/gi, '')}`;
    await writeFile(join(dir, fileName), data);
    return fileName;
  }

  /** Načte uložený soubor. */
  read(supplierId: string, storedFileName: string): Promise<Buffer> {
    // Název pochází z DB (náš UUID), přesto odmítneme cokoli s oddělovači cest.
    if (/[\\/]/.test(storedFileName)) throw new Error('Neplatný název uloženého souboru.');
    return readFile(join(this.dirFor(supplierId), storedFileName));
  }

  private dirFor(supplierId: string): string {
    if (!/^[0-9a-f-]{36}$/i.test(supplierId)) throw new Error('Neplatné ID dodavatele.');
    return join(this.config.dataDir, 'uploads', supplierId);
  }
}
