import { randomUUID } from 'node:crypto';
import { IUserRepository, UserRecord } from '../types/user.types.js';
import { PrismaUserRepository } from './prismaUser.repository.js';

/**
 * In-Memory User Repository.
 *
 * ARCHITECTURAL NOTICE:
 * This in-memory implementation provides deterministic, isolated execution for unit test suites
 * and offline development without external database dependencies.
 */
export class InMemoryUserRepository implements IUserRepository {
  private users: Map<string, UserRecord> = new Map();

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return { ...user };
      }
    }
    return null;
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const user = this.users.get(id);
    return user ? { ...user } : null;
  }

  public async create(
    userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserRecord> {
    const now = new Date();
    const newUser: UserRecord = {
      id: randomUUID(),
      email: userData.email.trim().toLowerCase(),
      passwordHash: userData.passwordHash,
      fullName: userData.fullName.trim(),
      phone: userData.phone.trim(),
      role: userData.role,
      facilityId: userData.facilityId || null,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(newUser.id, newUser);
    return { ...newUser };
  }

  public async clear(): Promise<void> {
    this.users.clear();
  }
}

/**
 * Switchable User Repository.
 * Delegates to PrismaUserRepository when STORAGE_DRIVER === 'postgres',
 * falling back to InMemoryUserRepository for unit tests and offline workflows.
 */
export class SwitchableUserRepository implements IUserRepository {
  private inMemory = new InMemoryUserRepository();
  private prismaRepo = new PrismaUserRepository();

  private get active(): IUserRepository {
    if (process.env.STORAGE_DRIVER === 'postgres') {
      return this.prismaRepo;
    }
    return this.inMemory;
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    return this.active.findByEmail(email);
  }

  public async findById(id: string): Promise<UserRecord | null> {
    return this.active.findById(id);
  }

  public async create(
    userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserRecord> {
    return this.active.create(userData);
  }

  public async clear(): Promise<void> {
    return this.active.clear();
  }
}

export const userRepository = new SwitchableUserRepository();
