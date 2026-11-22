import { handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { recordViolation } from '@/shared/lib/ascent/service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; restrictionId: string }> }
) {
  const { id, restrictionId } = await context.params;
  return handleAscent((userId) => recordViolation(prismaAscentStore, userId, id, restrictionId));
}
