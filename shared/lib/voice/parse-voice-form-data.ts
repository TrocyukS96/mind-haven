import 'server-only';

import type { VoiceGoalOption } from './types';

export function parseGoalsFromFormData(value: FormDataEntryValue | null): VoiceGoalOption[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (item): item is VoiceGoalOption =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as VoiceGoalOption).id === 'string' &&
          typeof (item as VoiceGoalOption).title === 'string'
      )
      .map((goal) => ({
        id: goal.id.trim(),
        title: goal.title.trim(),
      }))
      .filter((goal) => goal.id && goal.title);
  } catch {
    return [];
  }
}
