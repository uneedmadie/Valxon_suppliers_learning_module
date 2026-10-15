/**
 * Drobné textové utility sdílené importní pipeline a generátory obsahu.
 */

/** Sloučí bílé znaky do jedné mezery a ořízne okraje. */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/** Zkrátí text na maximální délku se znakem „…“ (nerozdělí slovo, pokud to jde). */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut}…`;
}

/** Vytvoří URL slug bez diakritiky. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'dodavatel';
}

/**
 * Rozdělí text na věty. Pracuje konzervativně: dělí za . ! ? následovanými mezerou
 * a velkým písmenem/číslicí a také na koncích řádků (nadpisy, položky seznamů).
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ0-9„"])/u)
    .map((s) => normalizeWhitespace(s))
    .filter((s) => s.length > 0);
}

/** Normalizace pro porovnávání názvů (bez diakritiky, malá písmena, jen alfanumerické znaky). */
export function normalizeForMatch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
