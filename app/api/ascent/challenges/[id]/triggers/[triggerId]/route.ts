import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { deleteTrigger, updateTrigger } from '@/shared/lib/ascent/service';

interface RouteContext {
  params: Promise<{ id: string; triggerId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, triggerId } = await context.params;
  return handleAscent(async (userId) => updateTrigger(prismaAscentStore, userId, id, triggerId, await readJson(request)));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, triggerId } = await context.params;
  return handleAscent((userId) => deleteTrigger(prismaAscentStore, userId, id, triggerId));
}
