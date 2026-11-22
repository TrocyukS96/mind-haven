import { PrismaClient } from '@prisma/client';
import { isTransientDbError } from '@/shared/lib/db-retry';

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  let connected: Promise<void> | null = null;

  const ensureConnected = () => {
    if (!connected) {
      connected = client.$connect().catch((error: unknown) => {
        connected = null;
        throw error;
      });
    }

    return connected;
  };

  return client.$extends({
    name: 'neon-connection-retry',
    query: {
      async $allOperations({ args, query }) {
        try {
          await ensureConnected();
          return await query(args);
        } catch (error) {
          if (!isTransientDbError(error)) {
            throw error;
          }

          // $disconnect() on the Node-API engine leaves later queries stuck on
          // "Engine is not yet connected", which Auth.js reports as a configuration error.
          connected = null;
          await ensureConnected();
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
  await prisma.$connect();
}
