/**
 * Entita odpovědi studenta na kontrolní otázku. Existence záznamu = kapitola je `completed`
 * (pravidlo B: dokončení až po odeslání odpovědi, i nesprávné). Unikátní klíč
 * (uživatel, kapitola) brání duplicitám při refreshi či opakovaném odeslání.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

/** Odeslaná odpověď studenta, která dokončuje kapitolu. */
@Entity('chapter_answers')
@Unique(['userId', 'chapterId'])
@Index(['userId', 'supplierId'])
export class ChapterAnswer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  userId!: string;

  @Column({ type: 'varchar', length: 36 })
  supplierId!: string;

  @Column({ type: 'varchar', length: 36 })
  chapterId!: string;

  @Column({ type: 'integer' })
  chapterNumber!: number;

  @Column({ type: 'varchar', length: 36 })
  questionId!: string;

  @Column({ type: 'integer' })
  questionVersion!: number;

  @Column({ type: 'integer' })
  selectedIndex!: number;

  @Column({ type: 'boolean' })
  isCorrect!: boolean;

  /** Počet odeslání (opakovaný pokus kapitolu nevrací do nedokončeného stavu). */
  @Column({ type: 'integer', default: 1 })
  attempts!: number;

  @CreateDateColumn({ type: 'datetime' })
  answeredAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;
}
