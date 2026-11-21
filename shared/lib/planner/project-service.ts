import { randomUUID } from 'node:crypto';
import type { Project, ProjectNote, ProjectStatus, ProjectDeleteMode } from '@/entities/project/model/types';
import type { TaskPriority } from '@/entities/task/model/types';
import { prisma } from '@/shared/lib/db';
import { calculateCompletionProgress, tasksForProject } from '@/shared/lib/planner/calculate-progress';

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
const PRIORITIES = new Set<TaskPriority>(['low', 'medium', 'high', 'urgent']);
const STATUSES = new Set<ProjectStatus>(['active', 'paused', 'completed', 'archived']);

async function ownedGoalId(userId: string, goalId?: string | null): Promise<string | null> {
  if (!goalId) return null;
  const goal = await prisma.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  });
  return goal?.id ?? null;
}

function mapProject(row: {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  startDate: Date | null;
  plannedEnd: Date | null;
  color: string | null;
  icon: string | null;
  goalId: string | null;
  nextAction: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;
}): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: STATUSES.has(row.status as ProjectStatus) ? (row.status as ProjectStatus) : 'active',
    priority: PRIORITIES.has(row.priority as TaskPriority) ? (row.priority as TaskPriority) : 'medium',
    startDate: row.startDate?.toISOString(),
    plannedEnd: row.plannedEnd?.toISOString(),
    color: row.color ?? undefined,
    icon: row.icon ?? undefined,
    goalId: row.goalId ?? undefined,
    nextAction: row.nextAction,
    progress: row.progress,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapNote(row: {
  id: string;
  projectId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): ProjectNote {
  return {
    id: row.id,
    projectId: row.projectId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function refreshProjectProgress(userId: string, projectId?: string | null): Promise<void> {
  if (!projectId) return;

  const tasks = await prisma.task.findMany({
    where: { userId, projectId },
    select: { completed: true },
  });

  await prisma.project.updateMany({
    where: { id: projectId, userId },
    data: { progress: calculateCompletionProgress(tasks) },
  });
}

export async function listProjects(userId: string): Promise<Project[]> {
  const rows = await prisma.project.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map(mapProject);
}

export async function getProject(userId: string, projectId: string): Promise<Project | null> {
  const row = await prisma.project.findFirst({ where: { id: projectId, userId } });
  return row ? mapProject(row) : null;
}

export async function createProject(userId: string, input: Project): Promise<Project> {
  const title = input.title?.trim().slice(0, 500);
  if (!title) throw new Error('Project title is required');

  const id = SAFE_ID.test(input.id) ? input.id : randomUUID();
  const goalId = await ownedGoalId(userId, input.goalId);

  const row = await prisma.project.create({
    data: {
      id,
      userId,
      title,
      description: input.description?.trim().slice(0, 5000) ?? '',
      status: STATUSES.has(input.status) ? input.status : 'active',
      priority: PRIORITIES.has(input.priority) ? input.priority : 'medium',
      startDate: input.startDate ? new Date(input.startDate) : null,
      plannedEnd: input.plannedEnd ? new Date(input.plannedEnd) : null,
      color: input.color?.slice(0, 32) ?? null,
      icon: input.icon?.slice(0, 64) ?? null,
      goalId,
      nextAction: input.nextAction?.trim().slice(0, 500) ?? '',
      progress: 0,
    },
  });

  return mapProject(row);
}

export async function updateProject(userId: string, projectId: string, input: Partial<Project>): Promise<Project> {
  const existing = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!existing) throw new Error('Project not found');

  const goalId =
    input.goalId === undefined
      ? existing.goalId
      : await ownedGoalId(userId, input.goalId ?? null);

  const row = await prisma.project.update({
    where: { id: projectId },
    data: {
      title: input.title !== undefined ? input.title.trim().slice(0, 500) : undefined,
      description: input.description !== undefined ? input.description.trim().slice(0, 5000) : undefined,
      status:
        input.status && STATUSES.has(input.status) ? input.status : undefined,
      priority:
        input.priority && PRIORITIES.has(input.priority) ? input.priority : undefined,
      startDate:
        input.startDate === undefined
          ? undefined
          : input.startDate
            ? new Date(input.startDate)
            : null,
      plannedEnd:
        input.plannedEnd === undefined
          ? undefined
          : input.plannedEnd
            ? new Date(input.plannedEnd)
            : null,
      color: input.color === undefined ? undefined : input.color?.slice(0, 32) ?? null,
      icon: input.icon === undefined ? undefined : input.icon?.slice(0, 64) ?? null,
      goalId: input.goalId !== undefined ? goalId : undefined,
      nextAction:
        input.nextAction !== undefined ? input.nextAction.trim().slice(0, 500) : undefined,
    },
  });

  return mapProject(row);
}

export async function deleteProject(
  userId: string,
  projectId: string,
  mode: ProjectDeleteMode = 'detach'
): Promise<void> {
  const existing = await prisma.project.findFirst({ where: { id: projectId, userId } });
  if (!existing) throw new Error('Project not found');

  await prisma.$transaction(async (tx) => {
    if (mode === 'detach') {
      await tx.task.updateMany({
        where: { userId, projectId },
        data: { projectId: null },
      });
    }
  });

  await prisma.project.delete({ where: { id: projectId } });
}

export async function archiveProject(userId: string, projectId: string): Promise<Project> {
  return updateProject(userId, projectId, { status: 'archived' });
}

export async function listProjectNotes(userId: string, projectId: string): Promise<ProjectNote[]> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!project) throw new Error('Project not found');

  const rows = await prisma.projectNote.findMany({
    where: { userId, projectId },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(mapNote);
}

export async function createProjectNote(
  userId: string,
  projectId: string,
  content: string
): Promise<ProjectNote> {
  const project = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } });
  if (!project) throw new Error('Project not found');

  const row = await prisma.projectNote.create({
    data: {
      userId,
      projectId,
      content: content.trim().slice(0, 10000),
    },
  });
  return mapNote(row);
}

export async function deleteProjectNote(userId: string, noteId: string): Promise<void> {
  const note = await prisma.projectNote.findFirst({ where: { id: noteId, userId } });
  if (!note) throw new Error('Note not found');
  await prisma.projectNote.delete({ where: { id: noteId } });
}

export function computeProjectProgressFromTasks(tasks: { completed: boolean }[]): number {
  return calculateCompletionProgress(tasks);
}

export { tasksForProject };