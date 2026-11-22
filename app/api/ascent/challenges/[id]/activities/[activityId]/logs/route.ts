import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { earnXp } from '@/shared/lib/ascent/service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; activityId: string }> }
) {
  const { id, activityId } = await context.params;
  return handleAscent(async (userId) => {
    const input = await readJson(request);
    const body = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    return earnXp(prismaAscentStore, userId, { ...body, activityId, challengeId: id });
  });
}
