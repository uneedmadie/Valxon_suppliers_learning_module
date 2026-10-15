/**
 * Entita zdroje: jedna konkrétní webová podstránka, nahraný dokument nebo vložený text.
 * Každý fakt odkazuje na zdroj, aby šlo dohledat původ tvrzení (URL / stránka PDF / list XLSX).
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Technický typ zdroje. `web-root` je URL zadané správcem, `web` podstránka nalezená crawlerem. */
export type SourceKind = 'web-root' | 'web' | 'pdf' | 'docx' | 'xlsx' | 'text';

/** Původ informace – oficiální podklad dodavatele, externí rešerše, nebo interní podklad VALXON. */
export type SourceOrigin = 'official' | 'external' | 'internal';

/** Stav zpracování zdroje. `blocked` = zakázáno robots.txt / bezpečnostní politikou. */
export type SourceStatus = 'pending' | 'processed' | 'failed' | 'blocked';

/** Zdroj podkladů dodavatele. */
@Entity('sources')
@Index(['supplierId'])
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  @Column({ type: 'varchar', length: 16 })
  kind!: SourceKind;

  @Column({ type: 'varchar', length: 16, default: 'official' })
  origin!: SourceOrigin;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  url!: string | null;

  /** Původní název nahraného souboru (jen pro správce). */
  @Column({ type: 'varchar', length: 260, nullable: true })
  originalFileName!: string | null;

  /** Název souboru v lokálním úložišti (`storage/uploads/<supplierId>/`). */
  @Column({ type: 'varchar', length: 120, nullable: true })
  storedFileName!: string | null;

  @Column({ type: 'integer', nullable: true })
  sizeBytes!: number | null;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: SourceStatus;

  /** Srozumitelný popis chyby/blokace pro správce. */
  @Column({ type: 'text', nullable: true })
  error!: string | null;

  /** Upozornění extrakce (např. PDF bez textové vrstvy, ignorované cenové sloupce). */
  @Column({ type: 'simple-json', nullable: true })
  warnings!: string[] | null;

  /** Kořenový zdroj, ze kterého crawler podstránku objevil. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  parentSourceId!: string | null;

  @Column({ type: 'integer', default: 0 })
  textLength!: number;

  @Column({ type: 'datetime', nullable: true })
  retrievedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
