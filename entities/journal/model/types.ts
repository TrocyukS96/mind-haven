import type { DatePreset } from '@/entities/activity/model/types';

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
  createdAt?: string;
  updatedAt?: string;
}

export type JournalEntriesView = 'list' | 'table';
export type JournalTab = 'entries' | 'activity';
export type JournalEntriesSortField = 'date' | 'updatedAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface JournalEntriesSort {
  field: JournalEntriesSortField;
  direction: SortDirection;
}

export const DEFAULT_JOURNAL_ENTRIES_SORT: JournalEntriesSort = {
  field: 'date',
  direction: 'desc',
};

export interface JournalFilterState {
  datePreset: DatePreset;
  dateFrom?: string;
  dateTo?: string;
  tagIds: string[];
}

export const DEFAULT_JOURNAL_FILTER: JournalFilterState = {
  datePreset: 'all',
  tagIds: [],
};
