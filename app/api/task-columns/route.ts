import type { TaskColumnKind } from '@/entities/task-column/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import {
  createTaskColumn,
  listTaskColumns,
  taskColumnErrorStatus,
} from '@/shared/lib/planner/task-column-service';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const archivedOnly = params.get('archived') === 'only';
  const includeArchived = archivedOnly || params.get('includeArchived') === 'true';

  try {
    const columns = await listTaskColumns(userId, { includeArchived, archivedOnly });
    return NextResponse.json({ columns });
  } catch (error) {
    return plannerError(error, 'Failed to list columns');
  }
}

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as {
    title?: string;
    kind?: TaskColumnKind;
    dateFrom?: string;
    dateTo?: string;
  };

  try {
    const column = await createTaskColumn(userId, {
      title: body.title ?? '',
      kind: body.kind,
      dateFrom: body.dateFrom,
      dateTo: body.dateTo,
    });
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    const known = taskColumnErrorStatus(error);
    if (known) return NextResponse.json({ error: known.message }, { status: known.status });
    return plannerError(error, 'Failed to create column');
  }
}
