import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { createProjectNote } from '@/shared/lib/planner/project-service';
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
  const body = (await request.json()) as { content?: string };
  if (typeof body.content !== 'string' || !body.content.trim()) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  try {
    const note = await createProjectNote(userId, id, body.content);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return plannerError(error, 'Failed to create note');
  }
}
