import { JournalEntry, JournalTag } from '@/entities/journal/model/types';
import { buildJournalEntryEvent } from '@/entities/points/lib/calculate-points';
import { tryEarnPoints } from '@/entities/points/lib/process-point-event';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

export interface JournalSlice {
  journalEntries: JournalEntry[];
  journalTags: JournalTag[];
  journalTitles: string[];
  selectedJournalEntry: JournalEntry | null;
  isJournalFormOpen: boolean;
  addJournalEntry: (
    entry: Pick<JournalEntry, 'title' | 'content'> &
      Partial<
        Pick<
          JournalEntry,
          'date' | 'tagIds' | 'entryType' | 'reflectionPeriod' | 'reflectionAnswers'
        >
      >
  ) => void;
  updateJournalEntry: (id: string, data: Partial<Omit<JournalEntry, 'id'>>) => void;
  deleteJournalEntry: (id: string) => void;
  addJournalTag: (name: string) => string;
  addTagToEntry: (entryId: string, tagId: string) => void;
  removeTagFromEntry: (entryId: string, tagId: string) => void;
  openJournalForm: (entry?: JournalEntry) => void;
  closeJournalForm: () => void;
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function ensureTitle(titles: string[], title: string): string[] {
  const trimmed = title.trim();
  if (!trimmed) return titles;
  if (titles.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
    return titles;
  }
  return [...titles, trimmed];
}

export const createJournalSlice: StateCreator<AppStore, [], [], JournalSlice> = (set, get) => ({
  journalEntries: [],
  journalTags: [],
  journalTitles: [],
  selectedJournalEntry: null,
  isJournalFormOpen: false,

  addJournalEntry: (entry) => {
    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      title: entry.title,
      content: entry.content,
      date: entry.date ?? todayDateString(),
      tagIds: entry.tagIds ?? [],
      entryType: entry.entryType ?? 'free',
      reflectionPeriod: entry.reflectionPeriod,
      reflectionAnswers: entry.reflectionAnswers,
    };

    set((state) => ({
      journalTitles: ensureTitle(state.journalTitles, entry.title),
      journalEntries: [newEntry, ...state.journalEntries],
    }));

    tryEarnPoints(get, buildJournalEntryEvent(newEntry));
  },

  updateJournalEntry: (id, data) =>
    set((state) => ({
      journalTitles: data.title
        ? ensureTitle(state.journalTitles, data.title)
        : state.journalTitles,
      journalEntries: state.journalEntries.map((entry) =>
        entry.id === id ? { ...entry, ...data } : entry
      ),
    })),

  deleteJournalEntry: (id) =>
    set((state) => ({
      journalEntries: state.journalEntries.filter((entry) => entry.id !== id),
    })),

  addJournalTag: (name) => {
    const trimmed = name.trim();
    let tagId = '';

    set((state) => {
      const existing = state.journalTags.find(
        (tag) => tag.name.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) {
        tagId = existing.id;
        return state;
      }

      tagId = Date.now().toString();
      return {
        journalTags: [...state.journalTags, { id: tagId, name: trimmed }],
      };
    });

    return tagId;
  },

  addTagToEntry: (entryId, tagId) =>
    set((state) => ({
      journalEntries: state.journalEntries.map((entry) => {
        const tagIds = entry.tagIds ?? [];
        return entry.id === entryId && !tagIds.includes(tagId)
          ? { ...entry, tagIds: [...tagIds, tagId] }
          : entry;
      }),
    })),

  removeTagFromEntry: (entryId, tagId) =>
    set((state) => ({
      journalEntries: state.journalEntries.map((entry) =>
        entry.id === entryId
          ? { ...entry, tagIds: (entry.tagIds ?? []).filter((id) => id !== tagId) }
          : entry
      ),
    })),

  openJournalForm: (entry) =>
    set({
      selectedJournalEntry: entry ?? null,
      isJournalFormOpen: true,
    }),

  closeJournalForm: () =>
    set({
      selectedJournalEntry: null,
      isJournalFormOpen: false,
    }),
});
