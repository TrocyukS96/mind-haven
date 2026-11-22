import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { createChallenge, listChallenges } from '@/shared/lib/ascent/service';

export async function GET() {
  return handleAscent((userId) => listChallenges(prismaAscentStore, userId));
}

export async function POST(request: Request) {
  return handleAscent(async (userId) => {
    const input = await readJson(request);
    return createChallenge(prismaAscentStore, userId, input);
  }, 201);
}
