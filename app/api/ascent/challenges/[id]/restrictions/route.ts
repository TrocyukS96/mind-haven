import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { createRestriction, listRestrictions } from '@/shared/lib/ascent/service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAscent((userId) => listRestrictions(prismaAscentStore, userId, id));
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return handleAscent(
    async (userId) => createRestriction(prismaAscentStore, userId, id, await readJson(request)),
    201
  );
}
