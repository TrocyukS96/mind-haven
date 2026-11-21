import type { Project } from '@/entities/project/model/types';
import { plannerError, requirePlannerUser } from '@/shared/lib/planner/planner-http';
import { createProject } from '@/shared/lib/planner/project-service';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const userId = await requirePlannerUser();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as Project;

  try {
    const project = await createProject(userId, body);
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    return plannerError(error, 'Failed to create project');
  }
}