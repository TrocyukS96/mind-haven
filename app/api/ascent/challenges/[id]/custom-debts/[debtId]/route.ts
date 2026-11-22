import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { deleteCustomDebt, updateCustomDebt } from '@/shared/lib/ascent/service';

interface RouteContext {
  params: Promise<{ id: string; debtId: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id, debtId } = await context.params;
  return handleAscent(async (userId) => updateCustomDebt(prismaAscentStore, userId, id, debtId, await readJson(request)));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id, debtId } = await context.params;
  return handleAscent((userId) => deleteCustomDebt(prismaAscentStore, userId, id, debtId));
}
