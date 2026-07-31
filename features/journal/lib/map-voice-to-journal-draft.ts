import type { ParsedJournalVoiceResult } from '@/shared/lib/voice/parsers/journal-parser';

export interface JournalFormDraft {
  title: string;
  content: string;
  date?: string;
  tagId?: string;
  newTagName?: string;
}

export function mapVoiceResultToJournalDraft(parsed: ParsedJournalVoiceResult): JournalFormDraft {
  return {
    title: parsed.title,
    content: parsed.content,
    date: parsed.date ?? undefined,
    tagId: parsed.tagId ?? undefined,
    newTagName: parsed.tagName ?? undefined,
  };
}
