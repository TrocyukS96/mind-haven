import { auth } from '@/shared/lib/auth/auth';
import { createHabit, getHabits, type HabitInput } from '@/shared/lib/habit/habit-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const habits = await getHabits(session.user.id);
    return NextResponse.json({ habits });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load habits';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as HabitInput;

  try {
    const habit = await createHabit(session.user.id, body);
    return NextResponse.json({ habit }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create habit';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
