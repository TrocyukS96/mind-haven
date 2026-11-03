import type { Goal } from '@/entities/goal/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { createGoal } from '@/shared/lib/planner/planner-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Goal;

  try {
    const goal = await createGoal(userId, body);
    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return plannerError(error, 'Failed to create goal');
  }
}
