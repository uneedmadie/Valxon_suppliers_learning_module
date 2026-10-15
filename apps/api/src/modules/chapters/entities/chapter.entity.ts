/**
 * Entita výukové kapitoly. Každý dodavatel má právě sedm kapitol s pevnou navigací;
 * text kapitoly (lead, tělo, zajímavost) je editovatelný a před publikací schvaluje správce.
 */
import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/** Stav schválení kapitoly. */
export type ChapterStatus = 'draft' | 'approved';

/** Jedna ze sedmi kapitol výukové prezentace dodavatele. */
@Entity('chapters')
@Unique(['supplierId', 'number'])
export class Chapter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  /** Pořadí kapitoly 1–7. */
  @Column({ type: 'integer' })
  number!: number;

  @Column({ type: 'varchar', length: 160 })
  title!: string;

  /** Úvodní odstavec kapitoly. */
  @Column({ type: 'text', default: '' })
  lead!: string;

  /**
   * Tělo kapitoly v jednoduchém značkování: prázdný řádek = nový odstavec,
   * `- ` = odrážka, `## ` = mezititulek. Frontend jej renderuje bez HTML (bez XSS).
   */
  @Column({ type: 'text', default: '' })
  body!: string;

  /** Volitelný moment „Věděli jste, že…?“. */
  @Column({ type: 'text', nullable: true })
  highlight!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: ChapterStatus;

  /** Příznak, že text vznikl automaticky z citací a ještě jej neupravil člověk. */
  @Column({ type: 'boolean', default: true })
  isGeneratedDraft!: boolean;

  /** Verze obsahu kapitoly; progres studenta se při změně nemaže. */
  @Column({ type: 'integer', default: 1 })
  version!: number;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
