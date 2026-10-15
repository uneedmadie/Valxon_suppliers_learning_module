/**
 * Deterministické sestavení NÁVRHU textu kapitol z faktů (bez AI).
 * Návrh je kostra s doslovnými citacemi v původním jazyce – správce ji přepíše
 * do srozumitelného příběhu. Nic se nedomýšlí: chybí-li fakta, sekce se vynechá.
 */
import type { FactKind } from '../facts/entities/fact.entity';

/** Fakt potřebný pro návrh. */
export interface DraftFact {
  kind: FactKind;
  label: string;
  value: string;
  quote: string | null;
  status: 'proposed' | 'verified' | 'rejected';
}

/** Výsledný návrh textu kapitoly. */
export interface ChapterDraft {
  lead: string;
  body: string;
  highlight: string | null;
}

/** Vrátí hodnoty faktů daného druhu (ověřené nejdřív), nejvýše `limit`. */
function values(facts: DraftFact[], kind: FactKind, limit: number): DraftFact[] {
  return facts
    .filter((f) => f.kind === kind && f.status !== 'rejected')
    .sort((a, b) => Number(b.status === 'verified') - Number(a.status === 'verified'))
    .slice(0, limit);
}

/** Řádek citace v jednoduchém značkování (`> `). */
const quoteLine = (f: DraftFact): string => `> „${(f.quote ?? f.value).replace(/\s+/g, ' ').trim()}“`;

/** Sekce s nadpisem; prázdná, pokud nejsou řádky. */
function section(title: string, lines: string[]): string {
  return lines.length > 0 ? `## ${title}\n${lines.join('\n')}` : '';
}

const join = (...parts: string[]): string => parts.filter((p) => p.trim().length > 0).join('\n\n');

/**
 * Sestaví návrh kapitoly.
 * @param hasBestsellerList zda správce dodal seznam bestsellerů (jinak kap. 4 = reprezentativní výběr)
 */
export function buildChapterDraft(number: number, supplierName: string, facts: DraftFact[], hasBestsellerList: boolean): ChapterDraft {
  switch (number) {
    case 1: {
      const description = values(facts, 'description', 2);
      const hq = values(facts, 'headquarters', 1);
      return {
        lead: description[0] ? description[0].value : '',
        body: join(
          section(`Kdo je ${supplierName}`, description.map(quoteLine)),
          section('Specializace a čím je výjimečný', values(facts, 'specialization', 3).map(quoteLine)),
          section('Sídlo', hq.map((f) => `- ${f.value}`)),
        ),
        highlight: null,
      };
    }
    case 2: {
      const founded = values(facts, 'founded', 1);
      return {
        lead: founded[0] ? `Společnost ${supplierName} byla podle podkladů založena v roce ${founded[0].value}.` : '',
        body: join(
          section('Vize a mise', [...values(facts, 'vision', 2), ...values(facts, 'mission', 1)].map(quoteLine)),
          section('Zakladatelé', values(facts, 'founder', 2).map(quoteLine)),
          section('Milníky', values(facts, 'milestone', 4).map((f) => `- ${f.value}`)),
          section('Hodnoty a udržitelnost', values(facts, 'sustainability', 3).map(quoteLine)),
        ),
        highlight: values(facts, 'did_you_know', 1)[0]?.value ?? null,
      };
    }
    case 3: {
      const categories = values(facts, 'category', 14);
      return {
        lead: categories.length > 0 ? `Nabídka ${supplierName} v kostce: hlavní kategorie podle podkladů.` : '',
        body: join(
          section('Hlavní kategorie', categories.map((f) => `- ${f.value}`)),
          section('Materiály', values(facts, 'material', 3).map(quoteLine)),
        ),
        highlight: null,
      };
    }
    case 4:
      // Produkty se v kapitole vykreslují z dat; text jen pravdivě říká, o jaký výběr jde.
      return {
        lead: hasBestsellerList
          ? `Seznam nejprodávanějších produktů dodal správce VALXON; fotografie a údaje jsou spárované s podklady dodavatele.`
          : `Reprezentativní výběr produktů z podkladů dodavatele. Nejde o seznam bestsellerů – ten zatím správce nedodal.`,
        body: '',
        highlight: null,
      };
    case 5:
      return {
        lead: values(facts, 'technique', 1).length > 0 ? `Jak lze produkty ${supplierName} označit logem a jaké technologie podklady uvádějí.` : '',
        body: join(
          section('Technologie zušlechtění', values(facts, 'technique', 10).map((f) => `- ${f.value}`)),
          section('Tisková plocha a umístění loga', values(facts, 'print_area', 3).map(quoteLine)),
          section('Certifikace a standardy', values(facts, 'certification', 6).map((f) => `- ${f.value}`)),
        ),
        highlight: null,
      };
    case 6:
      return {
        lead: `Kdy ${supplierName} zvážit a co si ověřit před poptávkou.`,
        body: join(
          section('Minimální objednávka (MOQ)', values(facts, 'moq', 3).map(quoteLine)),
          section('Výroba a dodání', values(facts, 'lead_time', 3).map(quoteLine)),
          section('Vzorky', values(facts, 'samples', 2).map(quoteLine)),
          section('Objednávka a schválení', values(facts, 'ordering', 2).map(quoteLine)),
          section('Reklamace', values(facts, 'complaints', 2).map(quoteLine)),
          section('Doprava', values(facts, 'shipping', 2).map(quoteLine)),
          section('Kontakt', values(facts, 'contact', 2).map((f) => `- ${f.value}`)),
        ),
        highlight: null,
      };
    case 7: {
      // Tři poznatky jen z dostupných faktů; chybějící se nedoplňují vymyšleným textem.
      const takeaways: string[] = [];
      const description = values(facts, 'description', 1)[0];
      if (description) takeaways.push(`- Kdo to je: ${description.value}`);
      const techniques = values(facts, 'technique', 4).map((f) => f.value);
      if (techniques.length > 0) takeaways.push(`- Zušlechtění: ${techniques.join(', ')}`);
      const moq = values(facts, 'moq', 1)[0];
      if (moq) takeaways.push(`- Minimální objednávka: ${moq.value} (ověř podmínky)`);
      return {
        lead: takeaways.length > 0 ? `Tři věci, které si o ${supplierName} odnes.` : '',
        body: section('Tři klíčové poznatky', takeaways),
        highlight: null,
      };
    }
    default:
      return { lead: '', body: '', highlight: null };
  }
}
