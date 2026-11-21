import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { reorderTaskColumns } from '@/shared/lib/planner/task-column-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { columnIds?: string[] };

  try {
    await reorderTaskColumns(userId, body.columnIds ?? []);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    return plannerError(error, 'Failed to reorder columns');
  }
}