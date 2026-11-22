import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { reorderProjectSteps } from '@/shared/lib/planner/project-service';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { stepIds?: string[] };

  try {
    await reorderProjectSteps(userId, id, Array.isArray(body.stepIds) ? body.stepIds : []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return plannerError(error, 'Failed to reorder steps');
  }
}
