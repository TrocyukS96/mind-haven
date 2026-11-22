import { challengeQuery, handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { getHistory } from '@/shared/lib/ascent/service';

export async function GET(request: Request) {
  const challengeId = challengeQuery(request);
  return handleAscent((userId) => getHistory(prismaAscentStore, userId, challengeId));
}
