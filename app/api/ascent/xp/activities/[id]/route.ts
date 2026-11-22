import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { updateActivity } from '@/shared/lib/ascent/service';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleAscent(async (userId) => updateActivity(prismaAscentStore, userId, id, await readJson(request)));
}
