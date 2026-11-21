import type { TaskColumn } from '@/entities/task-column/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { refreshGoalProgress } from '@/shared/lib/planner/planner-service';
import { refreshProjectProgress } from '@/shared/lib/planner/project-service';
import {
  deleteTaskColumn,
  taskColumnErrorStatus,
  updateTaskColumn,
} from '@/shared/lib/planner/task-column-service';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<TaskColumn> & {
    archivedAt?: string | null;
    dateFrom?: string | null;
    dateTo?: string | null;
  };

  try {
    const column = await updateTaskColumn(userId, id, body);
    return NextResponse.json({ column });
  } catch (error) {
    const known = taskColumnErrorStatus(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return plannerError(error, 'Failed to update column');
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const params = new URL(request.url).searchParams;
  const transferTo = params.get('transferTo') ?? undefined;
  const deleteTasks = params.get('deleteTasks') === 'true';

  try {
    const affected = await deleteTaskColumn(userId, id, {
      transferToColumnId: transferTo,
      deleteTasks,
    });
    await Promise.all([
      ...affected.goalIds.map((goalId) => refreshGoalProgress(userId, goalId)),
      ...affected.projectIds.map((projectId) => refreshProjectProgress(userId, projectId)),
    ]);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    const known = taskColumnErrorStatus(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return plannerError(error, 'Failed to delete column');
  }
}
