/**
 * Stav AI kroku importu. V této verzi NENÍ zprovozněn žádný externí AI poskytovatel:
 * není schválené posílání (potenciálně neveřejných) podkladů třetí straně a není nakonfigurován klíč.
 * Služba proto vždy pravdivě vrací „nedostupné“ a import pokračuje deterministickou extrakcí
 * a ruční editací. Nikdy nepředstírá, že agent provedl research nebo sepsal text.
 */
import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../../config/app-config';
import type { ImportReport } from '../entities/import-job.entity';

/** Zjišťuje dostupnost AI extrakce. */
@Injectable()
export class AiExtractionService {
  constructor(private readonly config: AppConfig) {}

  /** Vrátí pravdivý stav AI kroku pro report importu. */
  status(): ImportReport['ai'] {
    if (!this.config.aiProvider) {
      return {
        status: 'unavailable',
        message: 'AI extrakce a externí rešerše nejsou zprovozněné: není nakonfigurován schválený AI poskytovatel. Fakta byla vytěžena deterministicky z citací; text kapitol je návrh k ruční úpravě.',
      };
    }
    if (!this.config.aiProviderApproved) {
      return {
        status: 'disabled',
        message: `AI poskytovatel „${this.config.aiProvider}“ je uveden, ale chybí schválení VALXON (AI_PROVIDER_APPROVED). Podklady nebyly odeslány žádné třetí straně.`,
      };
    }
    return {
      status: 'unavailable',
      message: `Adaptér pro AI poskytovatele „${this.config.aiProvider}“ není v této verzi implementován. Podklady nebyly odeslány; použita deterministická extrakce.`,
    };
  }
}
