import type { Task } from '@/entities/task/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { deleteTask, updateTask } from '@/shared/lib/planner/planner-service';
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
  const body = (await request.json()) as Partial<Task>;

  try {
    const task = await updateTask(userId, id, body);
    return NextResponse.json({ task });
  } catch (error) {
    return plannerError(error, 'Failed to update task');
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteTask(userId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return plannerError(error, 'Failed to delete task');
  }
}
