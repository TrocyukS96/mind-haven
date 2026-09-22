import {
  AdminUserActionError,
  banAdminUser,
  changeAdminUserRole,
  deleteAdminUser,
  unbanAdminUser,
} from '@/shared/lib/admin/user-admin-service';
import { requireAdmin } from '@/shared/lib/admin/require-admin';
import { NextResponse } from 'next/server';

function errorStatus(code: AdminUserActionError['code']): number {
  if (code === 'not_found') {
    return 404;
  }

  if (code === 'forbidden') {
    return 403;
  }

  return 400;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();

  if (!actor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: 'ban' | 'unban' | 'role';
    durationDays?: number;
    reason?: string;
    role?: string;
  };

  try {
    if (body.action === 'unban') {
      const user = await unbanAdminUser(actor, id);
      return NextResponse.json({ user });
    }

    if (body.action === 'ban') {
      const user = await banAdminUser(actor, id, Number(body.durationDays), body.reason);
      return NextResponse.json({ user });
    }

    if (body.action === 'role') {
      const user = await changeAdminUserRole(actor, id, String(body.role ?? ''));
      return NextResponse.json({ user });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    if (error instanceof AdminUserActionError) {
      return NextResponse.json({ error: error.code }, { status: errorStatus(error.code) });
    }

    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await requireAdmin();

  if (!actor) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    await deleteAdminUser(actor, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AdminUserActionError) {
      return NextResponse.json({ error: error.code }, { status: errorStatus(error.code) });
    }

    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
