'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Edit, MoreVertical, Trash2 } from 'lucide-react';
import type { JournalEntriesSort, JournalEntry } from '../model/types';
import { useStore } from '@/shared/store/store-config';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useLocale, useTranslations } from 'next-intl';

interface JournalEntriesTableProps {
  entries: JournalEntry[];
  sort: JournalEntriesSort;
  onSortChange: (sort: JournalEntriesSort) => void;
}

function formatDate(value: string | undefined, locale: string, fallback: string) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }

  return parsed.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function JournalEntriesTable({ entries, sort, onSortChange }: JournalEntriesTableProps) {
  const { journalTags, openJournalForm, deleteJournalEntry } = useStore();
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const tagsById = new Map(journalTags.map((tag) => [tag.id, tag.name]));

  const toggleSort = (field: JournalEntriesSort['field']) => {
    if (sort.field === field) {
      onSortChange({
        field,
        direction: sort.direction === 'desc' ? 'asc' : 'desc',
      });
      return;
    }

    onSortChange({ field, direction: 'desc' });
  };

  const renderSortIcon = (field: JournalEntriesSort['field']) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="ml-1 inline size-3.5 text-muted-foreground" />;
    }

    return sort.direction === 'asc' ? (
      <ArrowUp className="ml-1 inline size-3.5" />
    ) : (
      <ArrowDown className="ml-1 inline size-3.5" />
    );
  };

  return (
    <>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="min-w-[40rem] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">
                <button type="button" className="inline-flex items-center" onClick={() => toggleSort('title')}>
                  {t('table.title')}
                  {renderSortIcon('title')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button type="button" className="inline-flex items-center" onClick={() => toggleSort('date')}>
                  {t('table.date')}
                  {renderSortIcon('date')}
                </button>
              </th>
              <th className="px-4 py-3 font-medium">{t('table.tags')}</th>
              <th className="px-4 py-3 font-medium">
                <button type="button" className="inline-flex items-center" onClick={() => toggleSort('updatedAt')}>
                  {t('table.updated')}
                  {renderSortIcon('updatedAt')}
                </button>
              </th>
              <th className="w-12 px-2 py-3">
                <span className="sr-only">{tCommon('edit')}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const tagIds = entry.tagIds ?? [];

              return (
                <tr
                  key={entry.id}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-muted/40"
                  onClick={() => openJournalForm(entry)}
                >
                  <td className="min-w-[16rem] px-4 py-3 align-top">
                    <div className="break-words font-medium whitespace-pre-wrap">{entry.title}</div>
                    <div className="mt-1 break-words whitespace-pre-wrap text-sm text-muted-foreground">
                      {entry.content}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDate(entry.date, locale, entry.date)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {tagIds.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t('noTag')}</span>
                      ) : (
                        tagIds.map((tagId) => (
                          <Badge key={tagId} variant="secondary">
                            {tagsById.get(tagId) ?? tagId}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                    {formatDate(entry.updatedAt ?? entry.createdAt, locale, entry.date)}
                  </td>
                  <td className="px-2 py-3" onClick={(event) => event.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openJournalForm(entry)}>
                          <Edit className="mr-2 h-4 w-4" />
                          {tCommon('edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => setEntryToDelete(entry)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {tCommon('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <AlertDialog open={Boolean(entryToDelete)} onOpenChange={(open) => !open && setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('deleteEntryTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              {t('deleteEntryDescription', { title: entryToDelete?.title ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (entryToDelete) {
                  void deleteJournalEntry(entryToDelete.id);
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
