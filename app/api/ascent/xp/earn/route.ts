import { handleAscent, readJson } from '@/shared/lib/ascent/http';
import { prismaAscentStore } from '@/shared/lib/ascent/prisma-store';
import { earnXp } from '@/shared/lib/ascent/service';

export async function POST(request: Request) {
  return handleAscent(async (userId) => earnXp(prismaAscentStore, userId, await readJson(request)));
}
