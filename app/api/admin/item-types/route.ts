import {
  ITEM_TYPE_SECTIONS,
  type ItemTypeSection,
} from '@/shared/config/item-types';
import { hasMinRole } from '@/entities/user';
import { auth } from '@/shared/lib/auth/auth';
import {
  addItemType,
  deleteItemType,
  getItemTypes,
  ItemTypeError,
  updateItemTypeSettings,
} from '@/shared/lib/item-types/item-type-service';
import { NextResponse } from 'next/server';

function isItemTypeSection(value: string): value is ItemTypeSection {
  return ITEM_TYPE_SECTIONS.includes(value as ItemTypeSection);
}

function itemTypeErrorResponse(error: unknown, fallback: string) {
  if (error instanceof ItemTypeError) {
    return NextResponse.json({ error: error.code }, { status: 400 });
  }

  return NextResponse.json({ error: fallback }, { status: 400 });
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
    return itemTypeErrorResponse(error, 'Failed to add type');
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
    return itemTypeErrorResponse(error, 'Failed to update type');
  }
}

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id || !hasMinRole(session.user.role, 'ADMIN')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = (await request.json()) as {
    section?: string;
    key?: string;
  };

  if (!body.section || !body.key || !isItemTypeSection(body.section)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    const result = await deleteItemType(body.section, body.key);
    return NextResponse.json(result);
  } catch (error) {
    return itemTypeErrorResponse(error, 'Failed to delete type');
  }
}

export async function GET() {
  const types = await getItemTypes();
  return NextResponse.json({ types });
}
