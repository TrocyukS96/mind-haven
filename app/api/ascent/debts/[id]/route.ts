import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { setDebtConfirmation } from '@/shared/lib/ascent/service';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  return handleAscent(async (userId) => setDebtConfirmation(prismaAscentStore, userId, id, await readJson(request)));
}
