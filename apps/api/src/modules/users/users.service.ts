/**
 * Služba uživatelů: založení vývojových účtů při startu a jejich načítání.
 */
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';

/** Vývojové účty lokálního dema – jasně označené, nejde o produkční identity. */
export const DEV_USERS: ReadonlyArray<Pick<User, 'id' | 'name' | 'role'>> = [
  { id: 'dev-admin', name: 'Správce (vývojový účet)', role: 'admin' },
  { id: 'dev-student', name: 'Student (vývojový účet)', role: 'student' },
];

/** Správa uživatelských účtů. */
@Injectable()
export class UsersService implements OnApplicationBootstrap {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  /** Při startu zajistí existenci vývojových účtů (idempotentně). */
  async onApplicationBootstrap(): Promise<void> {
    for (const devUser of DEV_USERS) {
      const existing = await this.users.findOneBy({ id: devUser.id });
      if (!existing) await this.users.save(this.users.create(devUser));
    }
  }

  /** Najde uživatele podle ID, nebo vrátí `null`. */
  findById(id: string): Promise<User | null> {
    return this.users.findOneBy({ id });
  }

  /** Vrátí vývojový účet pro danou roli. */
  async findDevUserByRole(role: UserRole): Promise<User | null> {
    const devUser = DEV_USERS.find((u) => u.role === role);
    return devUser ? this.users.findOneBy({ id: devUser.id }) : null;
  }
}
