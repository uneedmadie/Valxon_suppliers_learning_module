/**
 * Závazná definice sedmi kapitol výukové prezentace (PRODUCT_SPEC_V2, kap. 3).
 * Názvy tvoří pevnou navigaci; obsah uvnitř se přizpůsobuje doloženým faktům.
 */
import type { FactKind } from '../facts/entities/fact.entity';

/** Definice jedné kapitoly a témat, která pro ni importní pipeline hledá. */
export interface ChapterDefinition {
  number: number;
  title: string;
  /** Témata, jejichž absence se reportuje jako „chybí“ (výzkumný plán kapitoly). */
  expectedTopics: { kind: FactKind; topic: string }[];
}

export const CHAPTER_COUNT = 7;

export const CHAPTER_DEFINITIONS: readonly ChapterDefinition[] = [
  {
    number: 1,
    title: 'Seznam se s dodavatelem',
    expectedTopics: [
      { kind: 'description', topic: 'Kdo je dodavatel a čím se zabývá' },
      { kind: 'headquarters', topic: 'Sídlo dodavatele' },
      { kind: 'specialization', topic: 'Specializace / unikátní hodnota' },
    ],
  },
  {
    number: 2,
    title: 'Příběh, vize a hodnoty',
    expectedTopics: [
      { kind: 'founded', topic: 'Rok založení' },
      { kind: 'vision', topic: 'Vize nebo mise (jen pokud je doložená)' },
      { kind: 'milestone', topic: 'Milníky historie' },
    ],
  },
  {
    number: 3,
    title: 'Co všechno nabízejí?',
    expectedTopics: [{ kind: 'category', topic: 'Segmenty a kategorie nabídky' }],
  },
  {
    number: 4,
    title: 'TOP 10 bestsellerů',
    expectedTopics: [],
  },
  {
    number: 5,
    title: 'Technologie a specializace',
    expectedTopics: [
      { kind: 'technique', topic: 'Technologie potisku a personalizace' },
      { kind: 'print_area', topic: 'Umístění loga / tisková plocha' },
    ],
  },
  {
    number: 6,
    title: 'Kdy a proč tohoto dodavatele využít?',
    expectedTopics: [
      { kind: 'moq', topic: 'Minimální objednací množství (MOQ) s podmínkami' },
      { kind: 'lead_time', topic: 'Lhůty výroby a dodání' },
      { kind: 'samples', topic: 'Vzorky' },
      { kind: 'complaints', topic: 'Reklamace' },
      { kind: 'contact', topic: 'Kontakt' },
    ],
  },
  {
    number: 7,
    title: 'Co si zapamatovat?',
    expectedTopics: [],
  },
];

/** Název kapitoly 4 bez seznamu bestsellerů od správce – nesmí tvrdit „TOP bestsellery“. */
export const REPRESENTATIVE_PRODUCTS_TITLE = 'Reprezentativní výběr produktů';

/** Vrátí definici kapitoly podle čísla. */
export function chapterDefinition(number: number): ChapterDefinition {
  const def = CHAPTER_DEFINITIONS.find((c) => c.number === number);
  if (!def) throw new Error(`Neexistující kapitola ${number}`);
  return def;
}
