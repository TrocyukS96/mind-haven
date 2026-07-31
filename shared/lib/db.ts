import { PrismaClient } from '@prisma/client';

const CONNECTION_ERROR_PATTERN =
  /closed|connection.*(terminated|reset|refused|lost)|can't reach database server|p1001|p1017/i;

function isConnectionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return CONNECTION_ERROR_PATTERN.test(error.message);
}

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return client.$extends({
    name: 'neon-connection-retry',
    query: {
      async $allOperations({ args, query }) {
        try {
          return await query(args);
        } catch (error) {
          if (!isConnectionError(error)) {
            throw error;
          }

          await client.$disconnect();
          await client.$connect();
          return await query(args);
        }
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function reconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  await prisma.$connect();
}
