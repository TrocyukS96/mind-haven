import type { TaskPriority } from '@/entities/task/model/types';
import type { VoiceGoalOption } from '../types';
import { resolveTaskGoalId } from './resolve-task-goal';

export interface ParsedTaskVoiceResult {
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  deadline?: string | null;
  type?: string | null;
  subtasks?: string[] | null;
  goalId?: string | null;
}

export const TASK_PARSER_SYSTEM_PROMPT = `You extract structured task data from transcribed speech.

IMPORTANT: Reply with ONLY a raw JSON object. Do not use markdown, code blocks, comments, or any text before or after JSON.

Schema:
{
  "title": string,
  "description": string | null,
  "priority": "low" | "medium" | "high" | "urgent" | null,
  "deadline": string | null,
  "type": "short" | "medium" | "long" | "backlog" | null,
  "subtasks": string[] | null,
  "goalId": string | null,
  "goalTitle": string | null
}

Rules:
- "title" is required and must be a concise task name.
- Infer dates from natural language ("tomorrow at 9am", "next Monday").
- Use current date/time context from the user message.
- If user lists shopping items or comma-separated actions, set a summary title and populate subtasks.
- If no date mentioned, deadline is null.
- If no priority mentioned, priority is null.
- If user asks to link/attach the task to a goal (e.g. "привязать к цели", "связать с целью", "для цели"), match against Available goals from the user message.
- When a goal is mentioned, set "goalTitle" to the goal name from speech and "goalId" to the matching id from Available goals when confident.
- "goalId" must be one of the provided goal ids or null.
- If no goal is mentioned, both goalId and goalTitle are null.
- Do not invent information not implied by the speech.`;

const PRIORITY_VALUES = ['low', 'medium', 'high', 'urgent'] as const;

const PRIORITY_ALIASES: Record<string, TaskPriority> = {
  low: 'low',
  medium: 'medium',
  high: 'high',
  urgent: 'urgent',
  низкий: 'low',
  низким: 'low',
  средний: 'medium',
  средним: 'medium',
  высокий: 'high',
  высоким: 'high',
  срочный: 'urgent',
  срочно: 'urgent',
  срочным: 'urgent',
};

export function normalizeTaskPriority(value: unknown): TaskPriority | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (PRIORITY_VALUES.includes(normalized as TaskPriority)) {
    return normalized as TaskPriority;
  }

  return PRIORITY_ALIASES[normalized] ?? null;
}

export function normalizeParsedTask(raw: unknown, goals: VoiceGoalOption[] = []): ParsedTaskVoiceResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid task parse response');
  }

  const data = raw as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';

  if (!title) {
    throw new Error('Task title is missing from AI response');
  }

  const typeValues = ['short', 'medium', 'long', 'backlog'] as const;

  const priority = normalizeTaskPriority(data.priority);

  const type =
    typeof data.type === 'string' &&
    typeValues.includes(data.type.trim().toLowerCase() as (typeof typeValues)[number])
      ? data.type.trim().toLowerCase()
      : null;

  const subtasks = Array.isArray(data.subtasks)
    ? data.subtasks.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : null;

  let deadline: string | null = null;
  if (typeof data.deadline === 'string' && data.deadline.trim()) {
    const parsed = new Date(data.deadline);
    if (!Number.isNaN(parsed.getTime())) {
      deadline = parsed.toISOString();
    }
  }

  const goalId = resolveTaskGoalId(
    typeof data.goalId === 'string' ? data.goalId : null,
    typeof data.goalTitle === 'string' ? data.goalTitle : null,
    goals
  );

  return {
    title,
    description: typeof data.description === 'string' ? data.description.trim() || null : null,
    priority,
    deadline,
    type,
    subtasks: subtasks?.length ? subtasks : null,
    goalId,
  };
}
