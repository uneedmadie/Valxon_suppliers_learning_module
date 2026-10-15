/**
 * Entita textového segmentu zdroje. Segment je nejmenší citovatelná jednotka
 * (stránka PDF, odstavec DOCX, řádek XLSX, blok webové stránky) s přesnou lokací.
 */
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Citovatelný úsek textu ze zdroje. */
@Entity('source_segments')
@Index(['sourceId'])
export class SourceSegment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  sourceId!: string;

  /** Pořadí segmentu ve zdroji. */
  @Column({ type: 'integer' })
  ordinal!: number;

  /** Lidsky čitelná lokace: „str. 3“, „odst. 12“, „list Products, ř. 8“ nebo URL podstránky. */
  @Column({ type: 'varchar', length: 400 })
  location!: string;

  @Column({ type: 'text' })
  text!: string;
}
