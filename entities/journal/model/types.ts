export interface JournalTag {
  id: string;
  name: string;
}

export type JournalEntryType = 'free' | 'reflection';

export type ReflectionPeriod = 'day' | 'week' | 'month' | 'year';

export const REFLECTION_PERIODS: ReflectionPeriod[] = ['day', 'week', 'month', 'year'];

export const REFLECTION_QUESTION_COUNT = 10;

export const REFLECTION_MIN_ANSWERS = 3;

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  date: string;
  tagIds: string[];
  entryType?: JournalEntryType;
  reflectionPeriod?: ReflectionPeriod;
  reflectionAnswers?: string[];
}

export interface JournalFilterState {
  dateFrom?: string;
  dateTo?: string;
  tagIds: string[];
}
