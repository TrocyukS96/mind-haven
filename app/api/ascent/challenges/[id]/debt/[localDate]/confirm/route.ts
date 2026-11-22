import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { confirmDebtBatch } from '@/shared/lib/ascent/service';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string; localDate: string }> }
) {
  const { id, localDate } = await context.params;
  return handleAscent(async (userId) =>
    confirmDebtBatch(prismaAscentStore, userId, id, localDate, await readJson(request))
  );
}
