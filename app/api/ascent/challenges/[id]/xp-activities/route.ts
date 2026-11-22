import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { createActivity } from '@/shared/lib/ascent/service';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleAscent(async (userId) => createActivity(prismaAscentStore, userId, id, await readJson(request)), 201);
}
