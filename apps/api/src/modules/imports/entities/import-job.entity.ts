/**
 * Entita importní úlohy. Uchovává skutečný průběh serverového zpracování (log),
 * výsledný report (selhané URL, chybějící témata, rozpory) a pravdivý stav AI extrakce.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Stav importní úlohy. */
export type ImportJobStatus = 'queued' | 'running' | 'completed' | 'completed_with_errors' | 'failed';

/** Jeden řádek průběhového logu importu. */
export interface ImportLogEntry {
  at: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

/** Souhrnný report importu pro správce. */
export interface ImportReport {
  sourcesProcessed: number;
  sourcesFailed: number;
  pagesFetched: number;
  factsCreated: number;
  productsDiscovered: number;
  failedUrls: { url: string; reason: string }[];
  missingTopics: { chapter: number; topic: string }[];
  conflicts: { kind: string; label: string; values: string[] }[];
  recommendations: string[];
  /** Pravdivý stav AI kroku – nikdy se nepředstírá úspěch. */
  ai: { status: 'unavailable' | 'disabled' | 'completed'; message: string };
  jsRenderingSuspected: boolean;
}

/** Běh importu podkladů jednoho dodavatele. */
@Entity('import_jobs')
@Index(['supplierId'])
export class ImportJob {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  @Column({ type: 'varchar', length: 24, default: 'queued' })
  status!: ImportJobStatus;

  @Column({ type: 'simple-json' })
  log!: ImportLogEntry[];

  @Column({ type: 'simple-json', nullable: true })
  report!: ImportReport | null;

  @Column({ type: 'datetime', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  finishedAt!: Date | null;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
