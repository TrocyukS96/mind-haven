import { requirePlannerUser } from '@/shared/lib/planner/planner-http';
import type { PlannerSnapshot } from '@/shared/lib/planner/planner-merge';
import { syncPlannerFromBrowser } from '@/shared/lib/planner/planner-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as PlannerSnapshot;

  try {
    const planner = await syncPlannerFromBrowser(userId, body);
    return NextResponse.json({ planner });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sync planner';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
