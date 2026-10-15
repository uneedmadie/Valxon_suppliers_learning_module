/**
 * Pomocné funkce pro práci s ověřenými fakty ve studentském pohledu.
 */
import type { LearnFact, LearnSupplier } from '@/api/types';

/** Ověřená fakta daného druhu napříč kapitolami. */
export function factsOf(supplier: LearnSupplier, kind: string): LearnFact[] {
  return supplier.chapters.flatMap((c) => c.facts.filter((f) => f.kind === kind));
}

/** Druhy faktů, které jednotlivé kapitoly zobrazují vlastním vizuálem (zbytek jde do přehledu). */
export const VISUAL_KINDS: Record<number, string[]> = {
  1: ['headquarters'],
  2: ['founded', 'milestone', 'vision', 'mission'],
  3: ['category'],
  4: [],
  5: ['technique', 'certification'],
  6: ['moq', 'lead_time', 'samples', 'ordering', 'complaints', 'shipping', 'contact', 'client_fit', 'weakness'],
  7: [],
};

/** Rozdělí hodnotu milníku „ROK: text“. */
export function splitMilestone(value: string): { year: string; text: string } {
  const match = /^(\d{4}):\s*(.*)$/s.exec(value);
  return match ? { year: match[1]!, text: match[2]! } : { year: '', text: value };
}
