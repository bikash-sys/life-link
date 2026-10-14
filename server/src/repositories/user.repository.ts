import { randomUUID } from 'node:crypto';
import { IUserRepository, UserRecord } from '../types/user.types.js';

/**
 * In-Memory User Repository.
 *
 * ARCHITECTURAL NOTICE:
 * This in-memory implementation provides deterministic, isolated execution for test suites
 * and offline development without external database dependencies.
 * Production persistence targets PostgreSQL through the Prisma User model (defined in schema.prisma).
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

export const userRepository = new InMemoryUserRepository();
