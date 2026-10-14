import { IUserRepository, UserRecord } from '../types/user.types.js';
import { getPrismaClient } from '../db/prisma.js';

export class PrismaUserRepository implements IUserRepository {
  private get prisma() {
    return getPrismaClient();
  }

  public async findByEmail(email: string): Promise<UserRecord | null> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      facilityId: user.facilityId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      facilityId: user.facilityId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public async create(
    userData: Omit<UserRecord, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: {
        email: userData.email.trim().toLowerCase(),
        passwordHash: userData.passwordHash,
        fullName: userData.fullName.trim(),
        phone: userData.phone.trim(),
        role: userData.role,
        facilityId: userData.facilityId || null,
      },
    });
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      facilityId: user.facilityId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  public async clear(): Promise<void> {
    await this.prisma.user.deleteMany({});
  }
}
