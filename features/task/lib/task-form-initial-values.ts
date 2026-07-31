import type { Task, TaskPriority, TaskType } from '@/entities/task/model/types';
import type { TaskFormDraft } from '@/features/task/lib/map-voice-to-task-draft';

interface BuildTaskFormValuesParams {
  task?: Task | null;
  draft?: TaskFormDraft | null;
  defaultGoalId?: string;
  defaultDeadline?: string;
  defaultType: TaskType;
}

export interface TaskFormValues {
  title: string;
  description: string;
  priority: TaskPriority;
  type: TaskType;
  goalId: string;
  completed: boolean;
  deadline: string;
  subtasks: string[];
}

export function buildTaskFormValues({
  task,
  draft,
  defaultGoalId,
  defaultDeadline,
  defaultType,
}: BuildTaskFormValuesParams): TaskFormValues {
  if (task) {
    return {
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      type: task.type || defaultType,
      goalId: task.goalId || 'none',
      completed: task.completed,
      deadline: task.deadline || '',
      subtasks: [],
    };
  }

  if (draft) {
    return {
      title: draft.title,
      description: draft.description || '',
      priority: draft.priority ?? 'medium',
      type: draft.type || defaultType,
      goalId: draft.goalId || defaultGoalId || 'none',
      completed: false,
      deadline: draft.deadline || defaultDeadline || '',
      subtasks: draft.subtasks || [],
    };
  }

  return {
    title: '',
    description: '',
    priority: 'medium',
    type: defaultType,
    goalId: defaultGoalId || 'none',
    completed: false,
    deadline: defaultDeadline || '',
    subtasks: [],
  };
}

export function getTaskFormKey(task?: Task | null, draft?: TaskFormDraft | null): string {
  if (task) {
    return `edit-${task.id}`;
  }

  if (draft) {
    return `voice-${draft.title}-${draft.priority ?? 'none'}-${draft.deadline ?? 'none'}-${draft.goalId ?? 'none'}`;
  }

  return 'new';
}
