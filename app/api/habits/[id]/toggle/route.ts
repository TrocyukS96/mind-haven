import { auth } from '@/shared/lib/auth/auth';
import { toggleHabitDay } from '@/shared/lib/habit/habit-service';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { date?: string };

  if (!body.date || typeof body.date !== 'string') {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    const habit = await toggleHabitDay(session.user.id, id, body.date);
    return NextResponse.json({ habit });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle habit day';
    const status = message === 'Habit not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
