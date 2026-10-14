import { UserRole } from './auth.types.js';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  role: UserRole;
  facilityId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Public/safe user representation omitting sensitive credentials (e.g. passwordHash).
 */
export type SafeUser = Omit<UserRecord, 'passwordHash'>;

/**
 * Contract for User Persistence operations.
 * Allows transparent swapping between InMemory and PostgreSQL/Prisma implementations.
 */
export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserRecord>;
  clear(): Promise<void>;
}
