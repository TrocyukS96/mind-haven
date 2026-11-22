import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { deleteReward, updateReward } from '@/shared/lib/ascent/service';

interface RouteContext {
  params: Promise<{ id: string; rewardId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, rewardId } = await context.params;
  return handleAscent(async (userId) => updateReward(prismaAscentStore, userId, id, rewardId, await readJson(request)));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, rewardId } = await context.params;
  return handleAscent((userId) => deleteReward(prismaAscentStore, userId, id, rewardId));
}
