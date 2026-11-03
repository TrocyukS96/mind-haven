import { requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { reorderPlanner } from '@/shared/lib/planner/planner-service';
import { NextResponse } from 'next/server';

interface ReorderBody {
  goals?: { id: string; type: string; kanbanOrder: number }[];
  tasks?: { id: string; type: string; kanbanOrder: number }[];
}

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as ReorderBody;

  try {
    await reorderPlanner(userId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to reorder';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
