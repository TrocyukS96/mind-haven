import { requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { savePlannerLayout } from '@/shared/lib/planner/planner-service';
import { NextResponse } from 'next/server';

export async function PATCH(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    goalsKanbanColumnOrder?: string[];
    tasksKanbanColumnOrder?: string[];
  };

  try {
    await savePlannerLayout(userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save layout';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
