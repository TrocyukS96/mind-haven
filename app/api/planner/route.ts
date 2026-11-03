import { requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { getPlanner } from '@/shared/lib/planner/planner-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const planner = await getPlanner(userId);
    return NextResponse.json({ planner });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load planner';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
