import { listAdminUsers } from '@/shared/lib/admin/user-admin-service';
import { requireAdmin } from '@/shared/lib/admin/require-admin';
import { NextResponse } from 'next/server';

export async function GET() {
  const actor = await requireAdmin();

  if (!actor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await listAdminUsers(actor);
  return NextResponse.json({ users });
}
