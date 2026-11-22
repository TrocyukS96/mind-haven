import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { getChallenge, updateChallenge } from '@/shared/lib/ascent/service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAscent((userId) => getChallenge(prismaAscentStore, userId, id));
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAscent(async (userId) => updateChallenge(prismaAscentStore, userId, id, await readJson(request)));
}
