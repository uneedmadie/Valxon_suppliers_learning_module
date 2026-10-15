/**
 * Entita faktu – doložitelné tvrzení o dodavateli s citací a stavem ověření.
 * Studentovi se zobrazují pouze fakta ve stavu `verified`; navržená fakta nikdy
 * automaticky nepřecházejí do ověřeného stavu.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Druh faktu – určuje, ve které části kapitoly se fakt zobrazí. */
export type FactKind =
  | 'description'
  | 'headquarters'
  | 'founded'
  | 'specialization'
  | 'vision'
  | 'mission'
  | 'history'
  | 'milestone'
  | 'founder'
  | 'sustainability'
  | 'did_you_know'
  | 'category'
  | 'material'
  | 'technique'
  | 'print_area'
  | 'certification'
  | 'moq'
  | 'lead_time'
  | 'samples'
  | 'ordering'
  | 'complaints'
  | 'shipping'
  | 'contact'
  | 'client_fit'
  | 'weakness'
  | 'image_hero'
  | 'note';

/** Stav ověření faktu správcem. */
export type FactStatus = 'proposed' | 'verified' | 'rejected';

/** Odkud tvrzení pochází. `manual` = doplnil správce. */
export type FactOrigin = 'official' | 'external' | 'manual';

/** Míra jistoty deterministické extrakce (ne pravdivosti!). */
export type FactConfidence = 'high' | 'medium' | 'low';

/** Doložitelné tvrzení o dodavateli. */
@Entity('facts')
@Index(['supplierId', 'chapter'])
export class Fact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  /** Číslo kapitoly 1–7, do které fakt patří. */
  @Column({ type: 'integer' })
  chapter!: number;

  @Column({ type: 'varchar', length: 32 })
  kind!: FactKind;

  /** Český popisek faktu (např. „Minimální objednávka“). */
  @Column({ type: 'varchar', length: 160 })
  label!: string;

  /** Normalizovaná hodnota pro výklad; správce ji může upravit. */
  @Column({ type: 'text' })
  value!: string;

  /** Doslovná citace ze zdroje (prázdná u ručně zadaných faktů). */
  @Column({ type: 'text', nullable: true })
  quote!: string | null;

  @Column({ type: 'varchar', length: 36, nullable: true })
  sourceId!: string | null;

  /** Přesná lokace citace ve zdroji (URL, „str. 4“…). */
  @Column({ type: 'varchar', length: 400, nullable: true })
  location!: string | null;

  @Column({ type: 'varchar', length: 16 })
  origin!: FactOrigin;

  @Column({ type: 'varchar', length: 16, default: 'proposed' })
  status!: FactStatus;

  @Column({ type: 'varchar', length: 8, default: 'medium' })
  confidence!: FactConfidence;

  /** Kdo a kdy fakt ověřil – auditní stopa schválení. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  verifiedBy!: string | null;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
