import { challengeQuery, handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { createActivity, listActivities } from '@/shared/lib/ascent/service';

export async function GET(request: Request) {
  const challengeId = challengeQuery(request);
  return handleAscent((userId) => listActivities(prismaAscentStore, userId, challengeId));
}

export async function POST(request: Request) {
  return handleAscent(async (userId) => createActivity(prismaAscentStore, userId, null, await readJson(request)), 201);
}
