/**
 * Deterministická (ne-AI) extrakce faktů z textových segmentů podle výzkumného plánu
 * sedmi kapitol. Každý kandidát nese doslovnou citaci, zdroj a lokaci. Výsledky jsou vždy
 * jen NÁVRHY (`proposed`) – pravdivost potvrzuje správce, extrakce ji nezaručuje.
 */
import { countryByCode, findCountryInText } from '../../../common/countries';
import { normalizeForMatch, normalizeWhitespace, splitSentences, truncate } from '../../../common/text';
import type { FactConfidence, FactKind } from '../../facts/entities/fact.entity';
import type { SourceOrigin } from '../../sources/entities/source.entity';
import type { PageLink, PageOrganization } from './html-extractor';

/** Vstupní segment pro extrakci. */
export interface ExtractionSegment {
  sourceId: string;
  location: string;
  text: string;
  origin: SourceOrigin;
}

/** Strukturované nápovědy z webu (JSON-LD, meta, navigace). */
export interface StructuredHints {
  sourceId: string;
  location: string;
  origin: SourceOrigin;
  isHomepage: boolean;
  metaDescription: string | null;
  ogImage: string | null;
  organization: PageOrganization | null;
  navLinks: PageLink[];
  siteHost: string;
  /** URL rozpoznané jako produkty – v navigaci to nejsou kategorie. */
  productUrls: string[];
}

/** Navržený fakt před uložením. */
export interface FactCandidate {
  chapter: number;
  kind: FactKind;
  label: string;
  value: string;
  quote: string | null;
  sourceId: string;
  location: string;
  origin: 'official' | 'external';
  confidence: FactConfidence;
}

/** Pravidlo pro větu: klíčová slova + volitelné vytažení normalizované hodnoty. */
interface SentenceRule {
  kind: FactKind;
  chapter: number;
  label: string;
  pattern: RegExp;
  /** Doplňková podmínka (např. věta musí obsahovat číslo). */
  requires?: RegExp;
  /** Věta s tímto vzorem se pravidlem nezpracuje (jiný význam téhož klíčového slova). */
  excludes?: RegExp;
  /** Vytáhne krátkou hodnotu; jinak se použije zkrácená věta. */
  value?: (sentence: string) => string | null;
  confidence: FactConfidence;
}

const YEAR = /\b(18[5-9]\d|19\d{2}|20[0-2]\d)\b/;
const QUANTITY = /(\d[\d\s.,]*)\s*(pcs|pieces|piece|units|items|pairs|sets|ks|kusů|kusy|stuks|stück|stk)\b/i;
const DURATION = /\d+(?:\s*[-–]\s*\d+)?\s*(working days|business days|workdays|days|weeks|pracovních dn[ůí]|dn[ůí]|týdn[ůy]|werkdagen|dagen|weken|arbeitstage|tage|wochen)/i;

/** Pravidla pro jednotlivé věty. Pořadí není důležité, věta může vytvořit více faktů. */
const SENTENCE_RULES: SentenceRule[] = [
  {
    kind: 'moq',
    chapter: 6,
    label: 'Minimální objednací množství (MOQ)',
    pattern: /\b(minimum order(?: quantity)?|min(?:imum|\.)? ?(?:order|qty|quantity)|MOQ|minimální (?:objednávk\w*|odběr\w*|množství)|mindestbestell\w*|minimale (?:afname|bestel\w*))\b/i,
    value: (s) => QUANTITY.exec(s)?.[0]?.trim() ?? null,
    confidence: 'medium',
  },
  {
    kind: 'lead_time',
    chapter: 6,
    label: 'Lhůta výroby / dodání',
    pattern: /\b(lead ?time|delivery time|production time|turnaround|dispatch|dodací lhůt\w*|doba výroby|levertijd|lieferzeit|productietijd|working days|business days|pracovních dn\w*|werkdagen|arbeitstage)\b/i,
    requires: DURATION,
    // „do 3 pracovních dnů nahlaste vadu“ je lhůta reklamace či platby, ne výroby/dodání.
    excludes: /\b(complain\w*|claims?|defect\w*|notify|reklamac\w*|klacht\w*|payment|invoice|faktur\w*)\b/i,
    value: (s) => DURATION.exec(s)?.[0] ?? null,
    confidence: 'medium',
  },
  {
    kind: 'samples',
    chapter: 6,
    label: 'Vzorky',
    pattern: /\b(samples?|sample order|vzor(?:ek|ky|ků)|muster|monsters?|stalen)\b/i,
    confidence: 'low',
  },
  {
    kind: 'complaints',
    chapter: 6,
    label: 'Reklamace a záruky',
    pattern: /\b(complaints?|claims?|defect(?:ive|s)?|return policy|returns are|reklamac\w*|warranty|klachten|reklamation\w*)\b/i,
    confidence: 'low',
  },
  {
    kind: 'shipping',
    chapter: 6,
    label: 'Doprava a doručení',
    pattern: /\b(shipping|freight|courier|incoterms?|carriage paid|free delivery|delivery costs?|transport costs?|doprava|doručení|verzend\w*|versand\w*)\b/i,
    confidence: 'low',
  },
  {
    kind: 'ordering',
    chapter: 6,
    label: 'Objednávka a schválení',
    pattern: /\b(how to order|place (?:an|your) order|request a quote|quotation|artwork|digital proof|virtual (?:sample|proof)|order confirmation|offerte|objednáv\w+ (?:probíhá|se provádí))\b/i,
    confidence: 'low',
  },
  {
    kind: 'print_area',
    chapter: 5,
    label: 'Tisková plocha / umístění loga',
    pattern: /\b(print(?:ing)? area|imprint area|branding area|decoration area|logo (?:placement|position|area)|max(?:imum|\.)? print(?:ing)? (?:size|area)|tisková plocha|druckfläche|bedrukkingsvlak)\b/i,
    confidence: 'medium',
  },
  {
    kind: 'vision',
    chapter: 2,
    label: 'Vize',
    pattern: /\b(our vision|vision is|vision:|naše vize|onze visie|unsere vision)\b/i,
    confidence: 'medium',
  },
  {
    kind: 'mission',
    chapter: 2,
    label: 'Mise',
    pattern: /\b(our mission|mission is|mission:|naše mise|naším posláním|onze missie|unsere mission)\b/i,
    confidence: 'medium',
  },
  {
    kind: 'vision',
    chapter: 2,
    label: 'Ambice / záměr (ověřte, zda jde o vizi)',
    pattern: /\b(we aim|our goal|our ambition|we strive|we want to|we believe|naším cílem|wij willen|ons doel)\b/i,
    confidence: 'low',
  },
  {
    kind: 'founder',
    chapter: 2,
    label: 'Zakladatelé',
    pattern: /\b(founder|founded by|co-?founder|zakladatel\w*|založil\w*|oprichter\w*|gründer\w*)\b/i,
    confidence: 'medium',
  },
  {
    kind: 'sustainability',
    chapter: 2,
    label: 'Udržitelnost a hodnoty',
    pattern: /\b(sustainab\w*|recycl\w*|ocean\w*|marine|plastic waste|circular\w*|carbon|CO2|climate|eco-?friendly|organic|udržiteln\w*|recykl\w*|duurza\w*|nachhaltig\w*|donat\w*)\b/i,
    confidence: 'low',
  },
  {
    kind: 'specialization',
    chapter: 1,
    label: 'Specializace / unikátní hodnota',
    pattern: /\b(speciali[sz]\w*|expert in|expertise|leading|market leader|focus(?:es|ed)? on|unique|zaměřen\w*|specializ\w*|gespecialiseerd|spezialisiert)\b/i,
    confidence: 'low',
  },
  {
    kind: 'description',
    chapter: 1,
    label: 'Kdo je dodavatel',
    pattern: /\b(is an? |are an? |we are |jsme |je |zijn een |sind ein)[^.]{0,80}\b(supplier|manufacturer|producer|company|brand|wholesaler|distributor|specialist|importer|dodavatel\w*|výrobce|leverancier|hersteller|lieferant)\b/i,
    confidence: 'medium',
  },
  {
    kind: 'material',
    chapter: 3,
    label: 'Materiály',
    pattern: /\b(made (?:of|from)|materials?:|vyroben\w* z|gemaakt van|hergestellt aus)\b/i,
    confidence: 'low',
  },
  {
    kind: 'headquarters',
    chapter: 1,
    label: 'Sídlo',
    pattern: /\b(based in|located in|headquartered in|head office|headquarters|sídl\w*|gevestigd|sitz in|hauptsitz)\b/i,
    value: (s) => findCountryInText(s)?.nameCs ?? null,
    confidence: 'medium',
  },
];

/** Slovník technologií zušlechtění (kap. 5) – kanonický český název + vzory napříč jazyky. */
const TECHNIQUES: { name: string; pattern: RegExp }[] = [
  { name: 'Sítotisk', pattern: /\b(screen ?print\w*|silk ?screen\w*|sítotisk\w*|zeefdruk|siebdruck)\b/i },
  { name: 'Výšivka', pattern: /\b(embroider\w*|výšiv\w*|borduur\w*|stick(?:erei|en))\b/i },
  { name: 'Tampotisk', pattern: /\b(pad ?print\w*|tampo ?print\w*|tampotisk\w*|tampondruk|tampondruck)\b/i },
  { name: 'Laserové gravírování', pattern: /\b(laser ?engrav\w*|laser\w* gravír\w*|gravír\w*|laser gravure|lasergravur|engraving)\b/i },
  { name: 'Digitální tisk', pattern: /\b(digital ?print\w*|full ?colou?r print\w*|digitální tisk|digitaldruck|digitale druk)\b/i },
  { name: 'Sublimace', pattern: /\b(sublimat\w*|sublimac\w*)\b/i },
  { name: 'Transferový tisk', pattern: /\b(heat ?transfer|transfer print\w*|transferový tisk|DTF|DTG)\b/i },
  { name: 'Ražba (deboss/emboss)', pattern: /\b(deboss\w*|emboss\w*|ražb\w*|slepotisk|prägung|blinddruck)\b/i },
  { name: 'UV tisk', pattern: /\b(UV[- ]?print\w*|UV tisk|UV-druck)\b/i },
  { name: 'Doming', pattern: /\b(doming|domed label|3D sticker)\b/i },
  { name: 'Žakárové tkaní / tkaná etiketa', pattern: /\b(jacquard\w*|woven (?:logo|label)\w*|žakár\w*|tkan\w* etiket\w*)\b/i },
  { name: 'Ofsetový tisk', pattern: /\b(offset ?print\w*|ofset\w*)\b/i },
  { name: 'Smaltování / barvený odlitek', pattern: /\b(enamel\w*|smalt\w*)\b/i },
];

/** Certifikace (kap. 5) – rozpoznávané zkratky a názvy. */
const CERTIFICATIONS = /\b(GOTS|OEKO-?TEX(?:®)?(?: Standard 100)?|GRS|Global Recycled Standard|BSCI|amfori|Sedex|SMETA|ISO ?\d{4,5}|FSC|PEFC|EcoVadis|Fair ?Wear|B ?Corp|REACH|LFGB)\b/g;

/** Navigační položky, které nejsou kategoriemi produktů. */
const NAV_STOP = /^(home|domů|about|about us|o nás|over ons|über uns|contact|kontakt|blog|news|novinky|faq|login|log in|sign in|register|account|cart|košík|basket|search|hledat|terms|privacy|cookies|careers?|jobs|kariéra|sustainability|udržitelnost|duurzaamheid|downloads?|catalog(?:ue)?s?|katalog\w*|menu|more|více|english|čeština|deutsch|nederlands|en|cs|de|nl|fr|shop|e-?shop|all products|products|produkty|producten|produkte|webshop|inspiration|projects?|reference|references|team|our story|story|history|historie|vision|mission|delivery|shipping|printing|branding|techniques?|service|services|support|help)$/i;

/** Slova, jejichž výskyt kdekoli v textu odkazu znamená, že nejde o kategorii (účet, košík, právní stránky). */
const NAV_NOISE = /\b(login|log in|register|registrace|sign (?:in|up)|account|účet|cart|košík|basket|wishlist|search|cookie|privacy|gdpr|terms|newsletter|download|press|career|jobs|einloggen|registrieren|anmelden|warenkorb|inloggen|winkelwagen|(?:discover|find out|read|learn|see|view|show) more|mehr (?:entdecken|erfahren)|get a quote|request a quote|angebot\w*|offerte|tech(?:nical)? specs?)\b/i;

/** Názvy jazyků v přepínačích jazykových verzí webu. */
const LANGUAGE_NAMES = /^(english|deutsch|français|francais|italiano|español|espanol|nederlands|polski|čeština|cestina|slovenčina|magyar|português|portugues|svenska|dansk|norsk|suomi|русский|українська|中文|日本語)$/i;

/** Poštovní směrovací číslo (různé evropské formáty) – signál, že blok je adresa. */
const POSTAL_CODE = /\b(\d{4,5}|\d{3} \d{2}|[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}|\d{4} ?[A-Z]{2})\b/;

/** Limity počtu faktů jednoho druhu – brání zahlcení review šumem. */
const KIND_LIMITS: Partial<Record<FactKind, number>> = {
  description: 4, headquarters: 4, founded: 4, specialization: 5, vision: 5, mission: 3, milestone: 8,
  founder: 3, sustainability: 6, category: 30, material: 6, technique: 15, print_area: 4, certification: 10,
  moq: 6, lead_time: 6, samples: 4, ordering: 4, complaints: 4, shipping: 5, contact: 3, image_hero: 1,
};

const toFactOrigin = (origin: SourceOrigin): 'official' | 'external' => (origin === 'external' ? 'external' : 'official');

/** Sběrač kandidátů s deduplikací a limity podle druhu. */
class CandidateCollector {
  private readonly items: FactCandidate[] = [];
  private readonly keys = new Set<string>();
  private readonly counts = new Map<FactKind, number>();

  add(candidate: FactCandidate): void {
    const key = `${candidate.kind}|${normalizeForMatch(candidate.value)}`;
    if (this.keys.has(key)) return;
    const count = this.counts.get(candidate.kind) ?? 0;
    if (count >= (KIND_LIMITS[candidate.kind] ?? 6)) return;
    this.keys.add(key);
    this.counts.set(candidate.kind, count + 1);
    this.items.push(candidate);
  }

  result(): FactCandidate[] {
    return this.items;
  }
}

/**
 * Z nápověd webu (JSON-LD, meta popis, navigace) vytvoří kandidáty s vyšší jistotou.
 * Strukturovaná data mají přednost, proto se zpracovávají před větami.
 */
function extractFromHints(hints: StructuredHints, out: CandidateCollector): void {
  const base = { sourceId: hints.sourceId, location: hints.location, origin: toFactOrigin(hints.origin) };
  const org = hints.organization;
  if (org?.description) {
    out.add({ ...base, chapter: 1, kind: 'description', label: 'Kdo je dodavatel (schema.org)', value: truncate(org.description, 400), quote: org.description, confidence: 'high' });
  }
  if (org?.foundingDate) {
    const year = YEAR.exec(org.foundingDate)?.[0] ?? org.foundingDate;
    out.add({ ...base, chapter: 2, kind: 'founded', label: 'Rok založení (schema.org)', value: year, quote: `foundingDate: ${org.foundingDate}`, confidence: 'high' });
  }
  if (org && (org.addressLocality || org.addressCountry)) {
    // addressCountry bývá ISO kód („NL“) nebo název země („Netherlands“).
    const rawCountry = org.addressCountry ?? '';
    const country = rawCountry.length === 2 ? countryByCode(rawCountry) : findCountryInText(rawCountry);
    const value = [org.addressLocality, country?.nameCs ?? org.addressCountry].filter(Boolean).join(', ');
    out.add({ ...base, chapter: 1, kind: 'headquarters', label: 'Sídlo (schema.org adresa)', value, quote: [org.streetAddress, org.addressLocality, org.addressCountry].filter(Boolean).join(', '), confidence: 'high' });
  }
  for (const founder of org?.founders ?? []) {
    out.add({ ...base, chapter: 2, kind: 'founder', label: 'Zakladatel (schema.org)', value: founder, quote: `founder: ${founder}`, confidence: 'high' });
  }
  if (org?.email) {
    out.add({ ...base, chapter: 6, kind: 'contact', label: 'Kontaktní e-mail (schema.org)', value: org.email, quote: `email: ${org.email}`, confidence: 'high' });
  }

  // Meta popis úvodní stránky je obvykle nejlepší jednovětá definice firmy.
  if (hints.isHomepage && hints.metaDescription && hints.metaDescription.length > 30) {
    out.add({ ...base, chapter: 1, kind: 'description', label: 'Kdo je dodavatel (meta popis webu)', value: hints.metaDescription, quote: hints.metaDescription, confidence: 'medium' });
  }
  // Úvodní fotografie: jen návrh – oprávnění k užití musí potvrdit správce.
  if (hints.isHomepage && hints.ogImage) {
    out.add({ ...base, chapter: 1, kind: 'image_hero', label: 'Úvodní fotografie z webu (ověřte oprávnění k užití)', value: hints.ogImage, quote: null, confidence: 'medium' });
  }

  // Kategorie z hlavní navigace stejného webu (kap. 3: segmenty → kategorie).
  const productUrls = new Set(hints.productUrls);
  for (const link of hints.navLinks) {
    if (productUrls.has(link.url)) continue;
    if (!link.inNav || link.text.length < 3 || link.text.length > 40 || NAV_STOP.test(link.text.trim()) || NAV_NOISE.test(link.text)) continue;
    let host = '';
    try {
      host = new URL(link.url).hostname.replace(/^www\./, '');
    } catch {
      continue;
    }
    if (host !== hints.siteHost.replace(/^www\./, '')) continue;
    const path = new URL(link.url).pathname;
    if (/\/(blog|news|about|contact|kontakt|faq|terms|privacy|cart|account|login)/i.test(path)) continue;
    // Jazykové přepínače (/fr, /de-at, „Français“) nejsou kategorie nabídky.
    if (/^\/[a-z]{2}(-[a-z]{2})?\/?$/i.test(path) || LANGUAGE_NAMES.test(link.text.trim())) continue;
    out.add({ ...base, location: link.url, chapter: 3, kind: 'category', label: 'Kategorie (navigace webu)', value: link.text, quote: `Odkaz v navigaci: „${link.text}“ → ${link.url}`, confidence: 'low' });
  }
}

/** Projde věty segmentu a aplikuje pravidla, slovník technologií, certifikace, roky a e-maily. */
function extractFromSegment(segment: ExtractionSegment, out: CandidateCollector): void {
  const base = { sourceId: segment.sourceId, location: segment.location, origin: toFactOrigin(segment.origin) };

  for (const sentence of splitSentences(segment.text)) {
    // Krátké řádky „Klíč: hodnota s číslem“ (např. „MOQ: 300 pieces“) jsou často nejpřesnější fakta.
    const isKeyValue = /^[^:]{2,30}:\s*\S/.test(sentence) && /\d/.test(sentence);
    if ((sentence.length < 20 && !isKeyValue) || sentence.length > 600) continue;
    const quote = truncate(sentence, 420);

    // Obecná pravidla podle klíčových slov.
    for (const rule of SENTENCE_RULES) {
      if (!rule.pattern.test(sentence)) continue;
      if (rule.requires && !rule.requires.test(sentence)) continue;
      if (rule.excludes?.test(sentence)) continue;
      const extracted = rule.value?.(sentence) ?? null;
      // U sídla bez rozpoznané země nemá smysl navrhovat fakt.
      if (rule.kind === 'headquarters' && !extracted) continue;
      out.add({
        ...base,
        chapter: rule.chapter,
        kind: rule.kind,
        label: rule.label,
        value: extracted ?? truncate(sentence, 300),
        quote,
        confidence: extracted ? rule.confidence : rule.confidence === 'medium' ? 'low' : rule.confidence,
      });
    }

    // Adresa: krátký blok s PSČ a názvem země (typicky kontakt/patička) → návrh sídla.
    if (sentence.length <= 200 && POSTAL_CODE.test(sentence)) {
      const country = findCountryInText(sentence);
      if (country) {
        out.add({ ...base, chapter: 1, kind: 'headquarters', label: 'Sídlo (adresa v podkladech)', value: country.nameCs, quote, confidence: 'low' });
      }
    }

    // Rok založení: klíčové slovo + rok v těsné blízkosti.
    const founded = /\b(founded|established|since|opgericht|gegründet|založen\w*|est\.)\b[^.]{0,40}?\b(18[5-9]\d|19\d{2}|20[0-2]\d)\b/i.exec(sentence);
    if (founded?.[2]) {
      out.add({ ...base, chapter: 2, kind: 'founded', label: 'Rok založení', value: founded[2], quote, confidence: 'medium' });
    }

    // Milník: rok + sloveso události; vylučujeme copyright patičky.
    const year = YEAR.exec(sentence)?.[0];
    if (year && !/©|copyright|all rights reserved/i.test(sentence) && /\b(launched|introduced|opened|started|became|moved|acquired|expanded|joined|won|received|celebrat\w*|founded|established|grew|built|switched|developed|založ\w*|otevř\w*|zahájil\w*|opgericht|gestart|gegründet)\b/i.test(sentence) && sentence.length <= 320) {
      out.add({ ...base, chapter: 2, kind: 'milestone', label: `Milník ${year}`, value: `${year}: ${truncate(sentence, 260)}`, quote, confidence: 'low' });
    }

    // Technologie zušlechtění: jeden fakt na technologii (první výskyt).
    for (const technique of TECHNIQUES) {
      if (technique.pattern.test(sentence)) {
        out.add({ ...base, chapter: 5, kind: 'technique', label: 'Technologie zušlechtění', value: technique.name, quote, confidence: 'medium' });
      }
    }

    // Certifikace: zkratky s jasným významem.
    for (const match of sentence.matchAll(CERTIFICATIONS)) {
      const name = normalizeWhitespace(match[0]);
      out.add({ ...base, chapter: 5, kind: 'certification', label: 'Certifikace / standard', value: name, quote, confidence: 'medium' });
    }
  }

  // Kontaktní e-maily (mimo názvy obrázků a placeholdery).
  for (const match of segment.text.matchAll(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g)) {
    const email = match[0].replace(/[.,;]+$/, '');
    if (/\.(png|jpe?g|gif|webp|svg)$/i.test(email) || /example\.|sentry|wixpress/i.test(email)) continue;
    out.add({ ...base, chapter: 6, kind: 'contact', label: 'Kontaktní e-mail', value: email, quote: truncate(normalizeWhitespace(segment.text.slice(Math.max(0, (match.index ?? 0) - 80), (match.index ?? 0) + email.length + 40)), 200), confidence: 'high' });
  }
}

/**
 * Hlavní vstup: z nápověd a segmentů vytvoří deduplikované kandidáty faktů.
 * Strukturovaná data se zpracují první, takže mají přednost při deduplikaci.
 */
export function extractFacts(hints: StructuredHints[], segments: ExtractionSegment[]): FactCandidate[] {
  const out = new CandidateCollector();
  for (const h of hints) extractFromHints(h, out);
  for (const s of segments) extractFromSegment(s, out);
  return out.result();
}

/** Druhy faktů, u nichž různé hodnoty znamenají rozpor, který musí řešit správce. */
const CONFLICT_KINDS: FactKind[] = ['founded', 'headquarters', 'moq', 'lead_time'];

/**
 * Najde rozpory: stejný druh tvrdého údaje s různými normalizovanými hodnotami z různých zdrojů.
 * Rozpory se neřeší automaticky – jen se nahlásí.
 */
export function detectConflicts(facts: { kind: FactKind; label: string; value: string; sourceId: string | null; confidence: FactConfidence }[]): { kind: string; label: string; values: string[] }[] {
  const conflicts: { kind: string; label: string; values: string[] }[] = [];
  for (const kind of CONFLICT_KINDS) {
    // U MOQ/lhůt porovnáváme jen hodnoty, které se podařilo normalizovat (krátké), ne celé věty.
    const relevant = facts.filter((f) => f.kind === kind && f.value.length <= 40);
    const distinct = new Map<string, { value: string; sources: Set<string> }>();
    for (const f of relevant) {
      const key = normalizeForMatch(f.value);
      const entry = distinct.get(key) ?? { value: f.value, sources: new Set<string>() };
      entry.sources.add(f.sourceId ?? 'manual');
      distinct.set(key, entry);
    }
    if (distinct.size > 1) {
      conflicts.push({ kind, label: relevant[0]?.label ?? kind, values: [...distinct.values()].map((d) => d.value) });
    }
  }
  return conflicts;
}
