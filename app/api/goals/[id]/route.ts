import type { Goal } from '@/entities/goal/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { deleteGoal, updateGoal } from '@/shared/lib/planner/planner-service';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<Goal>;

  try {
    const goal = await updateGoal(userId, id, body);
    return NextResponse.json({ goal });
  } catch (error) {
    return plannerError(error, 'Failed to update goal');
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteGoal(userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return plannerError(error, 'Failed to delete goal');
  }
}
