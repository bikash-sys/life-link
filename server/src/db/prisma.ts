import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

let prismaInstance: PrismaClient | null = null;
let poolInstance: pg.Pool | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const connectionString =
      process.env.DATABASE_URL ||
      'postgresql://localhost:5432/lifelink_test_integration';
    poolInstance = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(poolInstance);
    prismaInstance = new PrismaClient({ adapter });
  }
  return prismaInstance;
}

export const prisma = getPrismaClient();

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
  if (poolInstance) {
    await poolInstance.end();
    poolInstance = null;
  }
}
