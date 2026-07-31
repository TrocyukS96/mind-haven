import type { TaskPriority } from '@/entities/task/model/types';
import { normalizeTaskPriority } from './task-parser';

export interface ParsedGoalVoiceResult {
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  deadline?: string | null;
  type?: string | null;
  steps?: string[] | null;
}

export const GOAL_PARSER_SYSTEM_PROMPT = `You extract structured goal data from transcribed speech.

IMPORTANT: Reply with ONLY a raw JSON object. Do not use markdown, code blocks, comments, or any text before or after JSON.

Schema:
{
  "title": string,
  "description": string | null,
  "priority": "low" | "medium" | "high" | "urgent" | null,
  "deadline": string | null,
  "type": "short" | "medium" | "long" | "backlog" | null,
  "steps": string[] | null
}

Rules:
- "title" is required and must be a concise goal name.
- Infer dates from natural language ("tomorrow", "by end of month", "next Monday").
- Use current date/time context from the user message.
- If user lists steps, milestones, or stages (e.g. "шаги", "этапы", comma-separated actions), populate "steps".
- If user lists multiple actions without explicit steps wording, still populate "steps" when they are clearly sequential parts of the goal.
- If no date mentioned, deadline is null.
- If no priority mentioned, priority is null.
- "type" reflects goal horizon: short (days/weeks), medium (months), long (year+), backlog (someday).
- Do not invent information not implied by the speech.`;

const TYPE_VALUES = ['short', 'medium', 'long', 'backlog'] as const;

export function normalizeParsedGoal(raw: unknown): ParsedGoalVoiceResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid goal parse response');
  }

  const data = raw as Record<string, unknown>;
  const title = typeof data.title === 'string' ? data.title.trim() : '';

  if (!title) {
    throw new Error('Goal title is missing from AI response');
  }

  const priority = normalizeTaskPriority(data.priority);

  const type =
    typeof data.type === 'string' &&
    TYPE_VALUES.includes(data.type.trim().toLowerCase() as (typeof TYPE_VALUES)[number])
      ? data.type.trim().toLowerCase()
      : null;

  const steps = Array.isArray(data.steps)
    ? data.steps.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : null;

  let deadline: string | null = null;
  if (typeof data.deadline === 'string' && data.deadline.trim()) {
    const parsed = new Date(data.deadline);
    if (!Number.isNaN(parsed.getTime())) {
      deadline = parsed.toISOString();
    }
  }

  return {
    title,
    description: typeof data.description === 'string' ? data.description.trim() || null : null,
    priority,
    deadline,
    type,
    steps: steps?.length ? steps : null,
  };
}
