import { auth } from '@/shared/lib/auth/auth';
import { deleteHabit } from '@/shared/lib/habit/habit-service';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteHabit(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete habit';
    const status = message === 'Habit not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
