import { JournalEntry } from '@/entities/journal/model/types';
import { create, StateCreator } from 'zustand';

export interface JournalSlice {
    journalEntries: JournalEntry[];
    addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'date'>) => void;
}

export const createJournalSlice: StateCreator<JournalSlice> = (set) => ({
    journalEntries: [],
    addJournalEntry: (entry) =>
        set((state) => ({
            journalEntries: [
                {
                    ...entry,
                    id: Date.now().toString(),
                    date: new Date().toISOString().split('T')[0],
                },
                ...state.journalEntries,
            ],
        })),
});

export const useJournalStore = create<JournalSlice>()(createJournalSlice);