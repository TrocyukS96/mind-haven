import { auth } from '@/shared/lib/auth/auth';
import {
  createJournalEntry,
  getJournalData,
  type JournalEntryInput,
} from '@/shared/lib/journal/journal-entry-service';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getJournalData(session.user.id);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load journal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as JournalEntryInput;

  try {
    const entry = await createJournalEntry(session.user.id, body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create entry';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
