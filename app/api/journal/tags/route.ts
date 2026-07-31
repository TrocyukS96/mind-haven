import { auth } from '@/shared/lib/auth/auth';
import { createJournalTag, getJournalTags } from '@/shared/lib/journal/journal-entry-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const tags = await getJournalTags(session.user.id);
    return NextResponse.json({ tags });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load tags';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as { name?: string };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
  }

  try {
    const tag = await createJournalTag(session.user.id, body.name);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create tag';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
