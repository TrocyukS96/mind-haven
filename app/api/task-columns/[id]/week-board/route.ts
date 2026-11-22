import type { WeekLayoutPatch } from '@/entities/week-local-task/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { getWeekBoard, saveWeekLayout, WeekBoardError } from '@/shared/lib/planner/week-local-task-service';
import { NextResponse } from 'next/server';

function weekError(error: unknown, fallback: string) {
  if (error instanceof WeekBoardError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return plannerError(error, fallback);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;

  try {
    const board = await getWeekBoard(userId, id);
    return NextResponse.json(board);
  } catch (error) {
    return weekError(error, 'Failed to load week board');
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await context.params;
  const body = (await request.json()) as WeekLayoutPatch;

  try {
    await saveWeekLayout(userId, id, {
      localTasks: Array.isArray(body.localTasks) ? body.localTasks : [],
      placements: Array.isArray(body.placements) ? body.placements : [],
    });
    const board = await getWeekBoard(userId, id);
    return NextResponse.json(board);
  } catch (error) {
    return weekError(error, 'Failed to save week board');
  }
}
