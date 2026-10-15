/**
 * Entita kontrolní otázky kapitoly. Ke každé kapitole patří nejvýše jedna aktivní otázka;
 * studentovi se zobrazí jen ve stavu `approved` a správná odpověď musí být doložená.
 */
import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/** Stav schválení otázky. */
export type QuestionStatus = 'draft' | 'approved';

/** Kontrolní otázka na konci kapitoly. */
@Entity('questions')
@Unique(['chapterId'])
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 36 })
  chapterId!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'simple-json' })
  options!: string[];

  /** Index správné odpovědi v `options`; studentovi se před odesláním nikdy neposílá. */
  @Column({ type: 'integer' })
  correctIndex!: number;

  /** Vysvětlení zobrazené po odeslání odpovědi (správné i nesprávné). */
  @Column({ type: 'text' })
  explanation!: string;

  /** Fakt, který dokládá správnou odpověď. */
  @Column({ type: 'varchar', length: 36, nullable: true })
  factId!: string | null;

  @Column({ type: 'varchar', length: 16, default: 'generated' })
  origin!: 'generated' | 'manual';

  @Column({ type: 'varchar', length: 16, default: 'draft' })
  status!: QuestionStatus;

  /** Verze otázky – ukládá se k odpovědi studenta. */
  @Column({ type: 'integer', default: 1 })
  version!: number;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
