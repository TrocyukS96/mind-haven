import type { GoalType } from '@/entities/goal/model/types';
import type { TaskPriority } from '@/entities/task/model/types';
import type { ParsedGoalVoiceResult } from '@/shared/lib/voice/parsers/goal-parser';

export interface GoalFormDraft {
  title: string;
  description?: string;
  priority?: TaskPriority;
  deadline?: string;
  type?: GoalType;
  steps?: string[];
}

export function mapVoiceResultToGoalDraft(parsed: ParsedGoalVoiceResult): GoalFormDraft {
  return {
    title: parsed.title,
    description: parsed.description ?? undefined,
    priority: parsed.priority ?? undefined,
    deadline: parsed.deadline ?? undefined,
    type: parsed.type ?? undefined,
    steps: parsed.steps ?? undefined,
  };
}
