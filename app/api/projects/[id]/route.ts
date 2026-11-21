import type { Project, ProjectDeleteMode } from '@/entities/project/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import {
  deleteProject,
  getProject,
  updateProject,
} from '@/shared/lib/planner/project-service';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const project = await getProject(userId, id);
    if (!project) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return plannerError(error, 'Failed to load project');
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as Partial<Project>;

  try {
    const project = await updateProject(userId, id, body);
    return NextResponse.json({ project });
  } catch (error) {
    return plannerError(error, 'Failed to update project');
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const mode = (new URL(request.url).searchParams.get('mode') ?? 'detach') as ProjectDeleteMode;

  try {
    await deleteProject(userId, id, mode === 'unlink' ? 'unlink' : 'detach');
    return NextResponse.json({ ok: true as const });
  } catch (error) {
    return plannerError(error, 'Failed to delete project');
  }
}