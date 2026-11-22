import { handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { getHistory } from '@/shared/lib/ascent/service';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleAscent((userId) => getHistory(prismaAscentStore, userId, id));
}
