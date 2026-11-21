import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { deleteProjectNote } from '@/shared/lib/planner/project-service';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; noteId: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, noteId } = await context.params;

  try {
    await deleteProjectNote(userId, id, noteId);
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    return plannerError(error, 'Failed to delete note');
  }
}
