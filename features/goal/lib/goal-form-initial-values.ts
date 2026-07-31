import type { Goal, GoalType } from '@/entities/goal/model/types';
import type { TaskPriority } from '@/entities/task/model/types';
import type { GoalFormDraft } from '@/features/goal/lib/map-voice-to-goal-draft';

interface BuildGoalFormValuesParams {
  goal?: Goal | null;
  draft?: GoalFormDraft | null;
  defaultType: GoalType;
}

export interface GoalFormValues {
  title: string;
  description: string;
  deadline: string;
  progress: number;
  type: GoalType;
  priority: TaskPriority;
  steps: string[];
}

export function buildGoalFormValues({
  goal,
  draft,
  defaultType,
}: BuildGoalFormValuesParams): GoalFormValues {
  if (goal) {
    return {
      title: goal.title,
      description: goal.description || '',
      deadline: goal.deadline,
      progress: goal.progress,
      type: goal.type || defaultType,
      priority: goal.priority || 'medium',
      steps: [],
    };
  }

  if (draft) {
    return {
      title: draft.title,
      description: draft.description || '',
      deadline: draft.deadline || '',
      progress: 0,
      type: draft.type || defaultType,
      priority: draft.priority ?? 'medium',
      steps: draft.steps || [],
    };
  }

  return {
    title: '',
    description: '',
    deadline: '',
    progress: 0,
    type: defaultType,
    priority: 'medium',
    steps: [],
  };
}

export function getGoalFormKey(goal?: Goal | null, draft?: GoalFormDraft | null): string {
  if (goal) {
    return `edit-${goal.id}`;
  }

  if (draft) {
    return `voice-${draft.title}-${draft.priority ?? 'none'}-${draft.deadline ?? 'none'}-${draft.type ?? 'none'}`;
  }

  return 'new';
}
