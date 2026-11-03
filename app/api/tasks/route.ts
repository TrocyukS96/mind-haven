import type { Task } from '@/entities/task/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { createTask } from '@/shared/lib/planner/planner-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Task;

  try {
    const task = await createTask(userId, body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return plannerError(error, 'Failed to create task');
  }
}
