import type { JournalEntry } from '@/entities/journal/model/types';
import type { JournalFormDraft } from '@/features/journal/lib/map-voice-to-journal-draft';

function toDateString(value?: string): string {
  if (!value) return new Date().toISOString().split('T')[0];
  return value.split('T')[0];
}

interface BuildJournalFormValuesParams {
  entry?: JournalEntry | null;
  draft?: JournalFormDraft | null;
}

export interface JournalFormValues {
  title: string;
  content: string;
  date: string;
  selectedTagId: string;
  newTagName: string;
}

export function buildJournalFormValues({
  entry,
  draft,
}: BuildJournalFormValuesParams): JournalFormValues {
  if (entry) {
    const firstTagId = entry.tagIds?.[0];
    return {
      title: entry.title,
      content: entry.content,
      date: entry.date,
      selectedTagId: firstTagId ?? 'none',
      newTagName: '',
    };
  }

  if (draft) {
    return {
      title: draft.title,
      content: draft.content,
      date: draft.date ? toDateString(draft.date) : '',
      selectedTagId: draft.tagId ?? 'none',
      newTagName: draft.newTagName ?? '',
    };
  }

  return {
    title: '',
    content: '',
    date: '',
    selectedTagId: 'none',
    newTagName: '',
  };
}

export function getJournalFormKey(
  entry?: JournalEntry | null,
  draft?: JournalFormDraft | null
): string {
  if (entry) {
    return `edit-${entry.id}`;
  }

  if (draft) {
    return `voice-${draft.title}-${draft.date ?? 'none'}-${draft.tagId ?? draft.newTagName ?? 'none'}`;
  }

  return 'new';
}
