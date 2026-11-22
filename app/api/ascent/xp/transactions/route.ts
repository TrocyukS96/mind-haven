import { challengeQuery, handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { listXpTransactions } from '@/shared/lib/ascent/service';

export async function GET(request: Request) {
  const challengeId = challengeQuery(request);
  return handleAscent((userId) => listXpTransactions(prismaAscentStore, userId, challengeId));
}
