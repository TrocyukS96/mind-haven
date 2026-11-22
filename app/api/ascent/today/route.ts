import { handleAscent } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { getToday } from '@/shared/lib/ascent/service';

export async function GET() {
  return handleAscent((userId) => getToday(prismaAscentStore, userId));
}
