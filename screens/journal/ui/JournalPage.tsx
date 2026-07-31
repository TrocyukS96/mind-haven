'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Plus, Search } from 'lucide-react';
import { JournalFilterState } from '@/entities/journal/model/types';
import { JournalEntryCard } from '@/entities/journal/ui/JournalEntryCard';
import { JournalFilter } from '@/features/journal/filter/ui/journal-filter';
import { useJournalSync } from '@/features/journal/hooks/use-journal-sync';
import { useStoreHydrated } from '@/shared/hooks/use-store-hydrated';
import { useStore } from '@/shared/store/store-config';
import type { JournalData } from '@/shared/lib/journal/journal-entry-service';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { EmptyState } from '@/shared/ui/empty-state';
import { useTranslations } from 'next-intl';

const defaultFilter: JournalFilterState = { tagIds: [] };

interface JournalPageProps {
  initialData?: JournalData | null;
}

export function JournalPage({ initialData = null }: JournalPageProps) {
  const hydrated = useStoreHydrated();
  useJournalSync({ initialData });
  const { journalEntries, openJournalForm } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<JournalFilterState>(defaultFilter);
  const t = useTranslations('journal');

  const isFilterActive =
    Boolean(filter.dateFrom || filter.dateTo || filter.tagIds.length > 0);

  const filteredEntries = useMemo(() => {
    let result = journalEntries.map((entry) => ({
      ...entry,
      tagIds: entry.tagIds ?? [],
    }));

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (entry) =>
          entry.title.toLowerCase().includes(query) ||
          entry.content.toLowerCase().includes(query)
      );
    }

    if (filter.dateFrom) {
      result = result.filter((entry) => entry.date >= filter.dateFrom!);
    }

    if (filter.dateTo) {
      result = result.filter((entry) => entry.date <= filter.dateTo!);
    }

    if (filter.tagIds.length > 0) {
      result = result.filter((entry) =>
        filter.tagIds.every((tagId) => entry.tagIds.includes(tagId))
      );
    }

    return result;
  }, [journalEntries, searchQuery, filter]);

  if (!hydrated) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded bg-muted" />
        <div className="h-24 rounded bg-muted" />
        <div className="h-40 rounded bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1>{t('title')}</h1>
          <p className="text-muted-foreground mt-2">{t('subtitle')}</p>
        </div>
        <Button onClick={() => openJournalForm()}>
          <Plus size={20} />
          {t('newEntry')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="text"
                placeholder={t('searchPlaceholder')}
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <JournalFilter
              filter={filter}
              onApply={setFilter}
              onReset={() => setFilter(defaultFilter)}
              isActive={isFilterActive}
            />
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4">{t('entryHistory')}</h2>
        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={journalEntries.length === 0 ? t('noEntriesYet') : t('noEntriesFound')}
            description={
              journalEntries.length === 0
                ? t('createFirstEntry')
                : t('adjustFilters')
            }
          />
        ) : (
          <div className="space-y-4">
            {filteredEntries.map((entry) => (
              <JournalEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
