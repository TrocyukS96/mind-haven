import {
  ITEM_TYPE_SECTIONS,
  type ItemTypeSection,
} from '@/shared/config/item-types';
import { hasMinRole } from '@/entities/user';
import { auth } from '@/shared/lib/auth/auth';
import {
  addItemType,
  getItemTypes,
  updateItemTypeSettings,
} from '@/shared/lib/item-types/item-type-service';
import { NextResponse } from 'next/server';

function isItemTypeSection(value: string): value is ItemTypeSection {
  return ITEM_TYPE_SECTIONS.includes(value as ItemTypeSection);
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !hasMinRole(session.user.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    section?: string;
    key?: string;
    label?: string;
  };

  if (!body.section || !body.key || !body.label || !isItemTypeSection(body.section)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const types = await addItemType(
      body.section,
      body.key,
      body.label,
      session.user.id
    );
    return NextResponse.json({ types });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add type';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !hasMinRole(session.user.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    section?: string;
    key?: string;
    enabled?: boolean;
    label?: string;
    sortOrder?: number;
  };

  if (!body.section || !body.key || !isItemTypeSection(body.section)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const types = await updateItemTypeSettings(
      body.section,
      body.key,
      {
        enabled: body.enabled,
        label: body.label,
        sortOrder: body.sortOrder,
      },
      session.user.id
    );
    return NextResponse.json({ types });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update type';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const types = await getItemTypes();
  return NextResponse.json({ types });
}
