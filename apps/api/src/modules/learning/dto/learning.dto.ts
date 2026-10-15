/**
 * Studentské DTO: výhradně schválený výukový obsah. Neobsahují interní poznámky, ceny,
 * stavy ověření, citace interních dokumentů ani správnou odpověď před odesláním.
 */
import type { SupplierType } from '../../suppliers/entities/supplier.entity';
import type { AnswerResultDto, ProgressDto } from '../../progress/dto/progress.dto';

/** Ověřený fakt zobrazený studentovi (bez citace a stavu). */
export interface LearnFactDto {
  kind: string;
  label: string;
  value: string;
}

/** Veřejný zdroj kapitoly (jen veřejné webové stránky, nikdy interní soubory). */
export interface LearnSourceDto {
  title: string;
  url: string;
}

/** Produkt v kapitole 4. */
export interface LearnProductDto {
  id: string;
  name: string;
  sku: string | null;
  productUrl: string | null;
  /** Fotografie jen u potvrzené shody s přesným produktem. */
  imageUrl: string | null;
  description: string | null;
  material: string | null;
  category: string | null;
}

/** Kontrolní otázka bez správné odpovědi. */
export interface LearnQuestionDto {
  id: string;
  prompt: string;
  options: string[];
  version: number;
}

/** Kapitola ve studentském pohledu. */
export interface LearnChapterDto {
  id: string;
  number: number;
  title: string;
  lead: string;
  body: string;
  highlight: string | null;
  facts: LearnFactDto[];
  sources: LearnSourceDto[];
  products: LearnProductDto[];
  productListType: 'bestsellers' | 'representative' | null;
  question: LearnQuestionDto | null;
  answer: AnswerResultDto | null;
}

/** Orientační poloha pro mapu VALXON → sídlo (bez tvrzení o přepravní trase). */
export interface LearnLocationDto {
  city: string | null;
  countryCode: string;
  countryName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  valxon: { city: string; lat: number; lng: number };
}

/** Celý výukový profil dodavatele. */
export interface LearnSupplierDto {
  slug: string;
  name: string;
  tagline: string | null;
  supplierType: SupplierType;
  websiteUrl: string | null;
  heroImageUrl: string | null;
  location: LearnLocationDto | null;
  chapters: LearnChapterDto[];
  progress: ProgressDto;
  /** True v náhledu správce (obsah ještě nemusí být publikovaný). */
  preview: boolean;
}

/** Položka katalogu publikovaných dodavatelů. */
export interface LearnSupplierSummaryDto {
  slug: string;
  name: string;
  tagline: string | null;
  supplierType: SupplierType;
  countryName: string | null;
  heroImageUrl: string | null;
  progress: ProgressDto;
}
