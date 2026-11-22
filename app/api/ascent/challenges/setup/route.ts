import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { setupChallenge } from '@/shared/lib/ascent/setup';

export async function POST(request: Request) {
  return handleAscent(async (userId) => {
    const input = await readJson(request);
    return setupChallenge(prismaAscentStore, userId, input);
  }, 201);
}
