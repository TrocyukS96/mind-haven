import { handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { archiveChallenge } from '@/shared/lib/ascent/service';

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleAscent((userId) => archiveChallenge(prismaAscentStore, userId, id));
}
