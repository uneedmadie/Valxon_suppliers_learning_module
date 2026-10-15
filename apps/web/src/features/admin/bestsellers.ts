/**
 * Parsování seznamu bestsellerů zadaného správcem jako text:
 * jeden produkt na řádek ve tvaru „Název | SKU | URL“ (SKU a URL nepovinné).
 */
import type { BestsellerInput } from '@/api/types';

/** Výsledek parsování s případnými chybami řádků. */
export interface ParsedBestsellers {
  items: BestsellerInput[];
  errors: string[];
}

export function parseBestsellers(text: string): ParsedBestsellers {
  const items: BestsellerInput[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  lines.forEach((line, index) => {
    const parts = line.split('|').map((p) => p.trim());
    const [name = '', second = '', third = ''] = parts;
    // URL může být zadaná jako druhý i třetí sloupec – rozpoznáme ji podle protokolu.
    const url = [second, third].find((p) => /^https?:\/\//i.test(p));
    const sku = [second, third].find((p) => p && !/^https?:\/\//i.test(p));
    if (name.length < 2) {
      errors.push(`Řádek ${index + 1}: chybí název produktu.`);
      return;
    }
    items.push({ name, ...(sku ? { sku } : {}), ...(url ? { url } : {}) });
  });

  if (items.length > 10) errors.push(`Zadáno ${items.length} produktů – seznam bestsellerů může mít nejvýše 10.`);
  return { items, errors };
}

/** Převede uložené bestsellery zpět na text pro editaci. */
export function formatBestsellers(items: { inputName: string | null; inputSku: string | null; inputUrl: string | null }[]): string {
  return items.map((i) => [i.inputName ?? '', i.inputSku ?? '', i.inputUrl ?? ''].filter((p, idx) => idx === 0 || p).join(' | ')).join('\n');
}
