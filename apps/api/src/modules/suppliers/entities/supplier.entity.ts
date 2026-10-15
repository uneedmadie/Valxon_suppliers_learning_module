/**
 * Entita dodavatele – kořen celého výukového profilu (zdroje, fakta, kapitoly, produkty).
 * Stav `published` je jediná brána, přes kterou se obsah dostane ke studentovi.
 */
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

/** Životní cyklus profilu dodavatele. */
export type SupplierStatus = 'draft' | 'importing' | 'review' | 'published';

/** Hrubý typ dodavatele; ovlivňuje, jak se učí kapitola „Co všechno nabízejí?“. */
export type SupplierType = 'unknown' | 'specialist' | 'narrow' | 'generalist';

/** Dodavatel, pro kterého vzniká sedmidílná výuková prezentace. */
@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** URL identifikátor pro studentskou část (`/learn/<slug>`). */
  @Column({ type: 'varchar', length: 120, unique: true })
  slug!: string;

  @Column({ type: 'varchar', length: 160 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: SupplierStatus;

  @Column({ type: 'varchar', length: 16, default: 'unknown' })
  supplierType!: SupplierType;

  /** Hlavní web zadaný správcem (výchozí bod crawleru). */
  @Column({ type: 'varchar', length: 2048, nullable: true })
  websiteUrl!: string | null;

  /** Krátké heslo do hero úvodu; píše/schvaluje správce. */
  @Column({ type: 'varchar', length: 240, nullable: true })
  tagline!: string | null;

  /** Město sídla – vyplňuje/potvrzuje správce podle ověřeného faktu. */
  @Column({ type: 'varchar', length: 120, nullable: true })
  hqCity!: string | null;

  /** ISO 3166-1 alpha-2 kód země sídla (pro mapu VALXON → sídlo). */
  @Column({ type: 'varchar', length: 2, nullable: true })
  hqCountryCode!: string | null;

  /** Interní poznámka správce; studentovi se nikdy nevrací. */
  @Column({ type: 'text', nullable: true })
  adminNotes!: string | null;

  /** Verze publikovaného obsahu; zvyšuje se při každé publikaci. */
  @Column({ type: 'integer', default: 0 })
  contentVersion!: number;

  @Column({ type: 'datetime', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
