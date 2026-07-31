import type { ParsedTaskVoiceResult } from '@/shared/lib/voice/parsers';
import type { TaskPriority, TaskType } from '@/entities/task/model/types';

export interface TaskFormDraft {
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  type?: TaskType;
  subtasks?: string[];
  goalId?: string;
}

export function mapVoiceResultToTaskDraft(parsed: ParsedTaskVoiceResult): TaskFormDraft {
  return {
    title: parsed.title,
    description: parsed.description ?? undefined,
    priority: parsed.priority ?? undefined,
    deadline: parsed.deadline ?? undefined,
    type: parsed.type ?? undefined,
    subtasks: parsed.subtasks ?? undefined,
    goalId: parsed.goalId ?? undefined,
  };
}
