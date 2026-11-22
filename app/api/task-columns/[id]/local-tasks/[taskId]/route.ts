import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import {
  deleteWeekLocalTask,
  updateWeekLocalTask,
  WeekBoardError,
} from '@/shared/lib/planner/week-local-task-service';
import { NextResponse } from 'next/server';

function weekError(error: unknown, fallback: string) {
  if (error instanceof WeekBoardError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return plannerError(error, fallback);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, taskId } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    plannedDate?: string | null;
    sortOrder?: number;
  };

  try {
    const task = await updateWeekLocalTask(userId, id, taskId, body);
    return NextResponse.json({ task });
  } catch (error) {
    return weekError(error, 'Failed to update local task');
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, taskId } = await context.params;

  try {
    await deleteWeekLocalTask(userId, id, taskId);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    return weekError(error, 'Failed to delete local task');
  }
}
