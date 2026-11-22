import { handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { unlinkHabit } from '@/shared/lib/ascent/service';

export async function DELETE(_request: Request, context: { params: Promise<{ id: string; linkId: string }> }) {
  const { id, linkId } = await context.params;
  return handleAscent((userId) => unlinkHabit(prismaAscentStore, userId, id, linkId));
}
