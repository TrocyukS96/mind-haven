import {
  createJournalEntryRequest,
  createJournalTagRequest,
  deleteJournalEntryRequest,
  updateJournalEntryRequest,
} from '@/entities/journal/api/journal-client';
import { JournalEntry, JournalTag } from '@/entities/journal/model/types';
import type { JournalFormDraft } from '@/features/journal/lib/map-voice-to-journal-draft';
import { buildJournalEntryEvent } from '@/entities/points/lib/calculate-points';
import { tryEarnPoints } from '@/entities/points/lib/process-point-event';
import type { JournalData } from '@/shared/lib/journal/journal-entry-service';
import { shouldUseJournalApi } from '@/entities/journal/lib/resolve-journal-api';
import { StateCreator } from 'zustand';
import type { AppStore } from '../store-config';

export interface JournalSlice {
  journalEntries: JournalEntry[];
  journalTags: JournalTag[];
  journalTitles: string[];
  journalApiEnabled: boolean;
  selectedJournalEntry: JournalEntry | null;
  isJournalFormOpen: boolean;
  journalFormDraft: JournalFormDraft | null;
  setJournalApiEnabled: (enabled: boolean) => void;
  hydrateJournalData: (data: JournalData) => void;
  addJournalEntry: (
    entry: Pick<JournalEntry, 'title' | 'content'> &
      Partial<
        Pick<
          JournalEntry,
          'date' | 'tagIds' | 'entryType' | 'reflectionPeriod' | 'reflectionAnswers'
        >
      >
  ) => Promise<void>;
  updateJournalEntry: (id: string, data: Partial<Omit<JournalEntry, 'id'>>) => Promise<void>;
  deleteJournalEntry: (id: string) => Promise<void>;
  addJournalTag: (name: string) => Promise<string>;
  addTagToEntry: (entryId: string, tagId: string) => Promise<void>;
  removeTagFromEntry: (entryId: string, tagId: string) => Promise<void>;
  openJournalForm: (entry?: JournalEntry) => void;
  openJournalFormFromVoice: (draft: JournalFormDraft) => void;
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

function upsertTag(tags: JournalTag[], tag: JournalTag): JournalTag[] {
  const exists = tags.some((item) => item.id === tag.id);
  if (exists) return tags;
  return [...tags, tag].sort((a, b) => a.name.localeCompare(b.name));
}

export const createJournalSlice: StateCreator<AppStore, [], [], JournalSlice> = (set, get) => ({
  journalEntries: [],
  journalTags: [],
  journalTitles: [],
  journalApiEnabled: false,
  selectedJournalEntry: null,
  isJournalFormOpen: false,
  journalFormDraft: null,

  setJournalApiEnabled: (enabled) => set({ journalApiEnabled: enabled }),

  hydrateJournalData: (data) =>
    set({
      journalEntries: data.entries,
      journalTags: data.tags,
      journalTitles: data.titles,
    }),

  addJournalEntry: async (entry) => {
    const payload = {
      title: entry.title,
      content: entry.content,
      date: entry.date ?? todayDateString(),
      tagIds: entry.tagIds ?? [],
      entryType: entry.entryType ?? 'free',
      reflectionPeriod: entry.reflectionPeriod,
      reflectionAnswers: entry.reflectionAnswers,
    };

    if (await shouldUseJournalApi()) {
      const savedEntry = await createJournalEntryRequest(payload);
      set((state) => ({
        journalTitles: ensureTitle(state.journalTitles, savedEntry.title),
        journalEntries: [savedEntry, ...state.journalEntries],
      }));
      tryEarnPoints(get, buildJournalEntryEvent(savedEntry));
      return;
    }

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      ...payload,
    };

    set((state) => ({
      journalTitles: ensureTitle(state.journalTitles, newEntry.title),
      journalEntries: [newEntry, ...state.journalEntries],
    }));

    tryEarnPoints(get, buildJournalEntryEvent(newEntry));
  },

  updateJournalEntry: async (id, data) => {
    if (await shouldUseJournalApi()) {
      const savedEntry = await updateJournalEntryRequest(id, data);
      set((state) => ({
        journalTitles: data.title
          ? ensureTitle(state.journalTitles, data.title)
          : state.journalTitles,
        journalEntries: state.journalEntries.map((entry) =>
          entry.id === id ? savedEntry : entry
        ),
        selectedJournalEntry:
          state.selectedJournalEntry?.id === id ? savedEntry : state.selectedJournalEntry,
      }));
      return;
    }

    set((state) => ({
      journalTitles: data.title
        ? ensureTitle(state.journalTitles, data.title)
        : state.journalTitles,
      journalEntries: state.journalEntries.map((entry) =>
        entry.id === id ? { ...entry, ...data } : entry
      ),
    }));
  },

  deleteJournalEntry: async (id) => {
    if (await shouldUseJournalApi()) {
      await deleteJournalEntryRequest(id);
    }

    set((state) => ({
      journalEntries: state.journalEntries.filter((entry) => entry.id !== id),
      selectedJournalEntry:
        state.selectedJournalEntry?.id === id ? null : state.selectedJournalEntry,
    }));
  },

  addJournalTag: async (name) => {
    const trimmed = name.trim();

    if (await shouldUseJournalApi()) {
      const tag = await createJournalTagRequest(trimmed);
      set((state) => ({
        journalTags: upsertTag(state.journalTags, tag),
      }));
      return tag.id;
    }

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

  addTagToEntry: async (entryId, tagId) => {
    const entry = get().journalEntries.find((item) => item.id === entryId);
    if (!entry) return;

    const tagIds = entry.tagIds ?? [];
    if (tagIds.includes(tagId)) return;

    const nextTagIds = [...tagIds, tagId];
    await get().updateJournalEntry(entryId, { tagIds: nextTagIds });
  },

  removeTagFromEntry: async (entryId, tagId) => {
    const entry = get().journalEntries.find((item) => item.id === entryId);
    if (!entry) return;

    const nextTagIds = (entry.tagIds ?? []).filter((id) => id !== tagId);
    await get().updateJournalEntry(entryId, { tagIds: nextTagIds });
  },

  openJournalForm: (entry) =>
    set({
      selectedJournalEntry: entry ?? null,
      isJournalFormOpen: true,
      journalFormDraft: null,
    }),

  openJournalFormFromVoice: (draft) =>
    set({
      selectedJournalEntry: null,
      isJournalFormOpen: true,
      journalFormDraft: draft,
    }),

  closeJournalForm: () =>
    set({
      selectedJournalEntry: null,
      isJournalFormOpen: false,
      journalFormDraft: null,
    }),
});
