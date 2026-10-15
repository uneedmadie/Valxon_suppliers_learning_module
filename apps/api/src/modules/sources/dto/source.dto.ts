/**
 * DTO zdrojů: vstupy pro přidání URL/textu a odpovědi pro správce.
 */
import { IsIn, IsOptional, IsString, IsUrl, Length, MaxLength } from 'class-validator';
import type { SourceSegment } from '../entities/source-segment.entity';
import type { Source, SourceKind, SourceOrigin, SourceStatus } from '../entities/source.entity';

/** Přidání webové adresy jako zdroje. */
export class AddUrlSourceDto {
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'Zadejte platnou URL začínající http(s)://' })
  @MaxLength(2048)
  url!: string;

  /** `external` = rešeršní zdroj mimo oficiální web dodavatele. */
  @IsOptional()
  @IsIn(['official', 'external'])
  origin?: Extract<SourceOrigin, 'official' | 'external'>;
}

/** Přidání ručně vloženého textu (např. poznámky z jednání, výtah z e-mailu). */
export class AddTextSourceDto {
  @IsString()
  @Length(2, 200)
  title!: string;

  @IsString()
  @Length(20, 100_000)
  text!: string;
}

/** Zdroj v pohledu správce. */
export class SourceResponseDto {
  id!: string;
  kind!: SourceKind;
  origin!: SourceOrigin;
  title!: string;
  url!: string | null;
  originalFileName!: string | null;
  sizeBytes!: number | null;
  status!: SourceStatus;
  error!: string | null;
  warnings!: string[];
  parentSourceId!: string | null;
  textLength!: number;
  retrievedAt!: string | null;

  /** Mapování entity na odpověď (bez interních cest k souborům). */
  static from(source: Source): SourceResponseDto {
    return {
      id: source.id,
      kind: source.kind,
      origin: source.origin,
      title: source.title,
      url: source.url,
      originalFileName: source.originalFileName,
      sizeBytes: source.sizeBytes,
      status: source.status,
      error: source.error,
      warnings: source.warnings ?? [],
      parentSourceId: source.parentSourceId,
      textLength: source.textLength,
      retrievedAt: source.retrievedAt ? source.retrievedAt.toISOString() : null,
    };
  }
}

/** Segment textu zdroje (náhled vytěženého obsahu pro správce). */
export class SourceSegmentResponseDto {
  id!: string;
  ordinal!: number;
  location!: string;
  text!: string;

  static from(segment: SourceSegment): SourceSegmentResponseDto {
    return { id: segment.id, ordinal: segment.ordinal, location: segment.location, text: segment.text };
  }
}
