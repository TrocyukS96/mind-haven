import { auth } from '@/shared/lib/auth/auth';
import {
  deleteJournalEntry,
  updateJournalEntry,
  type JournalEntryInput,
} from '@/shared/lib/journal/journal-entry-service';
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<JournalEntryInput>;

  try {
    const entry = await updateJournalEntry(session.user.id, id, body);
    return NextResponse.json({ entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update entry';
    const status = message === 'Entry not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteJournalEntry(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete entry';
    const status = message === 'Entry not found' ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
