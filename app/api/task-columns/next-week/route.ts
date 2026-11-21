import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { createNextWeekColumn, taskColumnErrorStatus } from '@/shared/lib/planner/task-column-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { dateFrom?: string; dateTo?: string; title?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }

  try {
    const column = await createNextWeekColumn(userId, body);
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    const known = taskColumnErrorStatus(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return plannerError(error, 'Failed to create week column');
  }
}
