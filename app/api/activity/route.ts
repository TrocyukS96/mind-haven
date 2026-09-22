import { auth } from '@/shared/lib/auth/auth';
import {
  getActivityEvents,
  recordActivityEvent,
} from '@/shared/lib/activity/activity-service';
import type { ActivityCategory, ActivityEventInput } from '@/entities/activity/model/types';
import { ACTIVITY_CATEGORIES } from '@/entities/activity/model/types';
import { NextResponse } from 'next/server';

function parseCategory(value: string | null): ActivityCategory | undefined {
  if (!value) return undefined;
  return (ACTIVITY_CATEGORIES as readonly string[]).includes(value)
    ? (value as ActivityCategory)
    : undefined;
}

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limitValue = Number(searchParams.get('limit'));

  try {
    const data = await getActivityEvents(session.user.id, {
      from: searchParams.get('from') ?? undefined,
      to: searchParams.get('to') ?? undefined,
      category: parseCategory(searchParams.get('category')),
      search: searchParams.get('search') ?? undefined,
      cursor: searchParams.get('cursor') ?? undefined,
      limit: Number.isFinite(limitValue) && limitValue > 0 ? limitValue : undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load activity';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as ActivityEventInput;

  try {
    const event = await recordActivityEvent(session.user.id, body);
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to record activity';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
