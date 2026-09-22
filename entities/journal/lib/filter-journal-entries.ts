import type {
  JournalEntriesSort,
  JournalEntry,
  JournalFilterState,
} from '../model/types';
import { resolveDatePresetRange } from '@/shared/lib/filters/date-presets';

export function filterJournalEntries(
  entries: JournalEntry[],
  searchQuery: string,
  filter: JournalFilterState
): JournalEntry[] {
  const query = searchQuery.trim().toLowerCase();
  const range = resolveDatePresetRange(filter.datePreset ?? 'all', {
    from: filter.dateFrom,
    to: filter.dateTo,
  });

  return entries
    .map((entry) => ({
      ...entry,
      tagIds: entry.tagIds ?? [],
    }))
    .filter((entry) => {
      if (query) {
        const matchesTitle = entry.title.toLowerCase().includes(query);
        const matchesContent = entry.content.toLowerCase().includes(query);
        if (!matchesTitle && !matchesContent) {
          return false;
        }
      }

      if (range.from && entry.date < range.from) {
        return false;
      }

      if (range.to && entry.date > range.to) {
        return false;
      }

      if (filter.tagIds.length > 0 && !filter.tagIds.every((tagId) => entry.tagIds.includes(tagId))) {
        return false;
      }

      return true;
    });
}

export function sortJournalEntries(
  entries: JournalEntry[],
  sort: JournalEntriesSort
): JournalEntry[] {
  const direction = sort.direction === 'asc' ? 1 : -1;

  return [...entries].sort((left, right) => {
    if (sort.field === 'title') {
      return left.title.localeCompare(right.title) * direction;
    }

    if (sort.field === 'updatedAt') {
      const leftValue = left.updatedAt ?? left.createdAt ?? left.date;
      const rightValue = right.updatedAt ?? right.createdAt ?? right.date;
      return leftValue.localeCompare(rightValue) * direction;
    }

    if (left.date === right.date) {
      const leftCreated = left.createdAt ?? left.date;
      const rightCreated = right.createdAt ?? right.date;
      return rightCreated.localeCompare(leftCreated);
    }

    return left.date.localeCompare(right.date) * direction;
  });
}
