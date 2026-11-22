import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import {
  createWeekLocalTask,
  WeekBoardError,
} from '@/shared/lib/planner/week-local-task-service';
import { NextResponse } from 'next/server';

function weekError(error: unknown, fallback: string) {
  if (error instanceof WeekBoardError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return plannerError(error, fallback);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    priority?: string;
    status?: string;
    plannedDate?: string | null;
    sortOrder?: number;
  };

  try {
    const task = await createWeekLocalTask(userId, id, body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return weekError(error, 'Failed to create local task');
  }
}
