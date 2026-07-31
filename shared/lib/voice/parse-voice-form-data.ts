import 'server-only';

import type { VoiceGoalOption, VoiceTagOption, VoiceAccountOption } from './types';

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

export function parseTagsFromFormData(value: FormDataEntryValue | null): VoiceTagOption[] {
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
        (item): item is VoiceTagOption =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as VoiceTagOption).id === 'string' &&
          typeof (item as VoiceTagOption).name === 'string'
      )
      .map((tag) => ({
        id: tag.id.trim(),
        name: tag.name.trim(),
      }))
      .filter((tag) => tag.id && tag.name);
  } catch {
    return [];
  }
}

export function parseAccountsFromFormData(
  value: FormDataEntryValue | null
): VoiceAccountOption[] {
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
        (item): item is VoiceAccountOption =>
          !!item &&
          typeof item === 'object' &&
          typeof (item as VoiceAccountOption).id === 'string' &&
          typeof (item as VoiceAccountOption).name === 'string' &&
          typeof (item as VoiceAccountOption).currency === 'string'
      )
      .map((account) => ({
        id: account.id.trim(),
        name: account.name.trim(),
        currency: account.currency.trim(),
      }))
      .filter((account) => account.id && account.name && account.currency);
  } catch {
    return [];
  }
}
