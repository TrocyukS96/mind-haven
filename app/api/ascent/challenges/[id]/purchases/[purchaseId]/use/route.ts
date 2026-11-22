import { handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { useRewardPurchase } from '@/shared/lib/ascent/service';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string; purchaseId: string }> }
) {
  const { id, purchaseId } = await context.params;
  return handleAscent((userId) => useRewardPurchase(prismaAscentStore, userId, id, purchaseId));
}
