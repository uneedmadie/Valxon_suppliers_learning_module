/**
 * Entita uživatele. V lokálním demu existují dva vývojové účty (správce a student);
 * role se vždy ověřuje na serveru podle podepsaného tokenu, ne podle přepínače ve frontendu.
 */
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

/** Role uživatele v akademii. */
export type UserRole = 'admin' | 'student';

/** Uživatel akademie (student nebo správce obsahu). */
@Entity('users')
export class User {
  /** Stabilní identifikátor (u vývojových účtů čitelný, např. `dev-student`). */
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'varchar', length: 16 })
  role!: UserRole;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;
}
