import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { deleteRestriction, updateRestriction } from '@/shared/lib/ascent/service';

interface RouteContext {
  params: Promise<{ id: string; restrictionId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, restrictionId } = await context.params;
  return handleAscent(async (userId) =>
    updateRestriction(prismaAscentStore, userId, id, restrictionId, await readJson(request))
  );
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, restrictionId } = await context.params;
  return handleAscent((userId) => deleteRestriction(prismaAscentStore, userId, id, restrictionId));
}
