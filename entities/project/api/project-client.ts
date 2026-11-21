import type { Project, ProjectDeleteMode } from '@/entities/project/model/types';
import { PlannerApiError } from '@/entities/planner/api/planner-client';

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new PlannerApiError(payload.error ?? 'Request failed', response.status);
  }
  return payload;
}

export async function createProjectRequest(project: Project): Promise<Project> {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  const payload = await parseResponse<{ project: Project }>(response);
  return payload.project;
}

export async function updateProjectRequest(id: string, project: Partial<Project>): Promise<Project> {
  const response = await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project),
  });
  const payload = await parseResponse<{ project: Project }>(response);
  return payload.project;
}

export async function deleteProjectRequest(
  id: string,
  mode: ProjectDeleteMode = 'detach'
): Promise<void> {
  const response = await fetch(`/api/projects/${id}?mode=${mode}`, { method: 'DELETE' });
  if (response.status === 404) return;
  await parseResponse<{ ok: true }>(response);
}