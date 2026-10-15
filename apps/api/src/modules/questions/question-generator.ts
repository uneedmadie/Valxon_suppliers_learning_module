/**
 * Deterministický generátor NÁVRHŮ kontrolních otázek z faktů (bez AI).
 * Správná odpověď je vždy hodnota konkrétního faktu, takže je doložená citací;
 * otázka přesto zůstává ve stavu `draft` a schvaluje ji správce – zejména kvůli
 * distraktorům, o kterých podklady nemusí nic říkat.
 */
import type { FactKind, FactStatus } from '../facts/entities/fact.entity';

/** Minimální podoba faktu, kterou generátor potřebuje. */
export interface QuestionFact {
  id: string;
  kind: FactKind;
  value: string;
  location: string | null;
  status: FactStatus;
}

/** Návrh otázky. */
export interface GeneratedQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  factId: string;
}

const COUNTRY_DISTRACTORS = ['Německo', 'Nizozemsko', 'Polsko', 'Itálie', 'Španělsko', 'Turecko', 'Čína', 'Belgie', 'Dánsko'];
const CATEGORY_DISTRACTORS = ['Pracovní obuv', 'Kancelářský nábytek', 'Průmyslová chemie', 'Stavební materiál'];
const TECHNIQUE_NAMES = ['Sítotisk', 'Výšivka', 'Tampotisk', 'Laserové gravírování', 'Digitální tisk', 'Sublimace', 'Ražba (deboss/emboss)', 'UV tisk'];

/** Stabilní „náhodná“ pozice správné odpovědi odvozená z textu (bez Math.random kvůli testovatelnosti). */
function stablePosition(seed: string, size: number): number {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash % size;
}

/** Vloží správnou odpověď mezi distraktory na stabilní pozici. */
function arrange(correct: string, distractors: string[], seed: string): { options: string[]; correctIndex: number } {
  const options = distractors.slice(0, 3);
  const correctIndex = stablePosition(seed, options.length + 1);
  options.splice(correctIndex, 0, correct);
  return { options, correctIndex };
}

/** Preferuje ověřená fakta před navrženými. */
function pick(facts: QuestionFact[], kind: FactKind, accept: (f: QuestionFact) => boolean = () => true): QuestionFact | null {
  const candidates = facts.filter((f) => f.kind === kind && f.status !== 'rejected' && accept(f));
  return candidates.find((f) => f.status === 'verified') ?? candidates[0] ?? null;
}

const where = (f: QuestionFact): string => (f.location ? ` (zdroj: ${f.location})` : '');

/**
 * Vygeneruje návrh otázky pro kapitolu, nebo `null`, pokud k tomu nejsou fakta.
 * `null` znamená, že správce uvidí „Chybí kontrolní otázka“ a doplní ji ručně.
 */
export function generateQuestion(chapterNumber: number, supplierName: string, facts: QuestionFact[]): GeneratedQuestion | null {
  switch (chapterNumber) {
    case 1: {
      // Sídlo: hodnota obsahuje český název země (normalizovaný při extrakci).
      const fact = pick(facts, 'headquarters', (f) => f.value.length <= 80);
      if (!fact) return null;
      const country = fact.value.split(',').pop()?.trim() ?? fact.value;
      const { options, correctIndex } = arrange(country, COUNTRY_DISTRACTORS.filter((c) => c !== country), supplierName + '1');
      return {
        prompt: `Ve které zemi sídlí ${supplierName}?`,
        options,
        correctIndex,
        explanation: `${supplierName} sídlí v zemi ${country}${where(fact)}.`,
        factId: fact.id,
      };
    }
    case 2: {
      const fact = pick(facts, 'founded', (f) => /^\d{4}$/.test(f.value.trim()));
      if (!fact) return null;
      const year = Number(fact.value.trim());
      const { options, correctIndex } = arrange(String(year), [String(year - 7), String(year + 5), String(year - 15)], supplierName + '2');
      return {
        prompt: `Ve kterém roce byla společnost ${supplierName} založena?`,
        options,
        correctIndex,
        explanation: `Podle podkladů byla společnost založena v roce ${year}${where(fact)}.`,
        factId: fact.id,
      };
    }
    case 3: {
      const fact = pick(facts, 'category', (f) => f.value.length <= 50);
      if (!fact) return null;
      const { options, correctIndex } = arrange(fact.value, CATEGORY_DISTRACTORS, supplierName + '3');
      return {
        prompt: `Která z těchto kategorií patří podle podkladů do nabídky ${supplierName}?`,
        options,
        correctIndex,
        explanation: `Kategorie „${fact.value}“ je doložena v podkladech dodavatele${where(fact)}.`,
        factId: fact.id,
      };
    }
    case 5: {
      const fact = pick(facts, 'technique');
      if (!fact) return null;
      const offered = new Set(facts.filter((f) => f.kind === 'technique' && f.status !== 'rejected').map((f) => f.value));
      const distractors = TECHNIQUE_NAMES.filter((t) => !offered.has(t));
      if (distractors.length < 3) return null;
      const { options, correctIndex } = arrange(fact.value, distractors, supplierName + '5');
      return {
        prompt: `Kterou technologii zušlechtění ${supplierName} podle podkladů nabízí?`,
        options,
        correctIndex,
        explanation: `Technologie „${fact.value}“ je doložena v podkladech${where(fact)}.`,
        factId: fact.id,
      };
    }
    case 6: {
      // MOQ s normalizovaným číslem a jednotkou; distraktory jsou násobky téže jednotky.
      const fact = pick(facts, 'moq', (f) => /^\d[\d\s.,]*\s*\S+$/.test(f.value.trim()) && f.value.length <= 30);
      if (!fact) return null;
      const match = /^(\d[\d\s.,]*)\s*(\S+)$/.exec(fact.value.trim());
      const amount = Number((match?.[1] ?? '').replace(/[\s.,]/g, ''));
      const unit = match?.[2] ?? 'ks';
      if (!Number.isFinite(amount) || amount <= 0) return null;
      const distractors = [amount * 5, Math.max(1, Math.round(amount / 2)), amount * 10].map((n) => `${n} ${unit}`);
      const { options, correctIndex } = arrange(fact.value.trim(), distractors, supplierName + '6');
      return {
        prompt: `Jaké minimální objednací množství uvádějí podklady ${supplierName}?`,
        options,
        correctIndex,
        explanation: `Podklady uvádějí minimální objednávku ${fact.value.trim()}${where(fact)}. Vždy si ověř podmínky (varianta, potisk).`,
        factId: fact.id,
      };
    }
    default:
      return null;
  }
}
