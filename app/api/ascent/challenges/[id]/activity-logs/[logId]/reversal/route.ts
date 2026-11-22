import { handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { reverseActivity } from '@/shared/lib/ascent/service';

export async function POST(_request: Request, context: { params: Promise<{ id: string; logId: string }> }) {
  const { id, logId } = await context.params;
  return handleAscent((userId) => reverseActivity(prismaAscentStore, userId, id, logId));
}
