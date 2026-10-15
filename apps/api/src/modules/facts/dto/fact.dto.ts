/**
 * DTO faktů: ruční zadání, úprava/ověření správcem a odpověď s citací pro review.
 */
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, MaxLength, Min } from 'class-validator';
import type { Fact, FactConfidence, FactKind, FactOrigin, FactStatus } from '../entities/fact.entity';

/** Povolené druhy faktů (pro validaci vstupu). */
export const FACT_KINDS: FactKind[] = [
  'description', 'headquarters', 'founded', 'specialization', 'vision', 'mission', 'history', 'milestone',
  'founder', 'sustainability', 'did_you_know', 'category', 'material', 'technique', 'print_area', 'certification',
  'moq', 'lead_time', 'samples', 'ordering', 'complaints', 'shipping', 'contact', 'client_fit', 'weakness',
  'image_hero', 'note',
];

/** Ruční doplnění faktu správcem (např. ze schůzky s dodavatelem). */
export class CreateFactDto {
  @IsInt()
  @Min(1)
  @Max(7)
  chapter!: number;

  @IsIn(FACT_KINDS)
  kind!: FactKind;

  @IsString()
  @Length(2, 160)
  label!: string;

  @IsString()
  @Length(1, 4000)
  value!: string;

  /** Odkud správce údaj zná (např. „e-mail od dodavatele 10. 10. 2026“). */
  @IsOptional()
  @IsString()
  @MaxLength(400)
  location?: string;
}

/** Úprava faktu – hodnota, zařazení nebo stav ověření. */
export class UpdateFactDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  chapter?: number;

  @IsOptional()
  @IsIn(FACT_KINDS)
  kind?: FactKind;

  @IsOptional()
  @IsString()
  @Length(2, 160)
  label?: string;

  @IsOptional()
  @IsString()
  @Length(1, 4000)
  value?: string;

  @IsOptional()
  @IsIn(['proposed', 'verified', 'rejected'])
  status?: FactStatus;
}

/** Hromadná změna stavu (např. „Ověřit vybrané“). */
export class BulkFactStatusDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID('4', { each: true })
  ids!: string[];

  @IsIn(['proposed', 'verified', 'rejected'])
  status!: FactStatus;
}

/** Fakt v pohledu správce včetně citace a zdroje. */
export class FactResponseDto {
  id!: string;
  chapter!: number;
  kind!: FactKind;
  label!: string;
  value!: string;
  quote!: string | null;
  sourceId!: string | null;
  location!: string | null;
  origin!: FactOrigin;
  status!: FactStatus;
  confidence!: FactConfidence;
  verifiedBy!: string | null;
  verifiedAt!: string | null;

  static from(f: Fact): FactResponseDto {
    return {
      id: f.id,
      chapter: f.chapter,
      kind: f.kind,
      label: f.label,
      value: f.value,
      quote: f.quote,
      sourceId: f.sourceId,
      location: f.location,
      origin: f.origin,
      status: f.status,
      confidence: f.confidence,
      verifiedBy: f.verifiedBy,
      verifiedAt: f.verifiedAt ? f.verifiedAt.toISOString() : null,
    };
  }
}
