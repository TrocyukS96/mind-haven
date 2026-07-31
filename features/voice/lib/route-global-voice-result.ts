import type { GlobalVoiceCommandResult } from '@/entities/voice';
import type {
  ParsedGoalVoiceResult,
  ParsedHabitVoiceResult,
  ParsedJournalVoiceResult,
  ParsedTaskVoiceResult,
} from '@/entities/voice';
import type { GoalFormDraft } from '@/features/goal/lib/map-voice-to-goal-draft';
import { mapVoiceResultToGoalDraft } from '@/features/goal/lib/map-voice-to-goal-draft';
import type { HabitFormDraft } from '@/features/habit/lib/map-voice-to-habit-draft';
import { mapVoiceResultToHabitDraft } from '@/features/habit/lib/map-voice-to-habit-draft';
import type { JournalFormDraft } from '@/features/journal/lib/map-voice-to-journal-draft';
import { mapVoiceResultToJournalDraft } from '@/features/journal/lib/map-voice-to-journal-draft';
import type { TaskFormDraft } from '@/features/task/lib/map-voice-to-task-draft';
import { mapVoiceResultToTaskDraft } from '@/features/task/lib/map-voice-to-task-draft';

interface RouteGlobalVoiceResultActions {
  openTaskFormFromVoice: (draft: TaskFormDraft) => void;
  openGoalFormFromVoice: (draft: GoalFormDraft) => void;
  openJournalFormFromVoice: (draft: JournalFormDraft) => void;
  openHabitFormFromVoice: (draft: HabitFormDraft) => void;
}

export function routeGlobalVoiceResult(
  result: GlobalVoiceCommandResult,
  actions: RouteGlobalVoiceResultActions
): GlobalVoiceCommandResult['entityType'] {
  switch (result.entityType) {
    case 'task':
      actions.openTaskFormFromVoice(
        mapVoiceResultToTaskDraft(result.parsed as ParsedTaskVoiceResult)
      );
      break;
    case 'goal':
      actions.openGoalFormFromVoice(
        mapVoiceResultToGoalDraft(result.parsed as ParsedGoalVoiceResult)
      );
      break;
    case 'journal':
      actions.openJournalFormFromVoice(
        mapVoiceResultToJournalDraft(result.parsed as ParsedJournalVoiceResult)
      );
      break;
    case 'habit':
      actions.openHabitFormFromVoice(
        mapVoiceResultToHabitDraft(result.parsed as ParsedHabitVoiceResult)
      );
      break;
  }

  return result.entityType;
}
