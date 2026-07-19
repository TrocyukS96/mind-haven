'use client';

import { useState } from 'react';
import { Clock, Edit, MoreVertical, Trash2 } from 'lucide-react';
import { JournalEntry } from '@/entities/journal/model/types';
import { TagSelector } from '@/features/journal/tag-selector/ui/tag-selector';
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
import { Card, CardContent } from '@/shared/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useLocale, useTranslations } from 'next-intl';

interface JournalEntryCardProps {
  entry: JournalEntry;
}

export function JournalEntryCard({ entry }: JournalEntryCardProps) {
  const { deleteJournalEntry, openJournalForm } = useStore();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  const tagIds = entry.tagIds ?? [];
  const isReflection = entry.entryType === 'reflection';

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold">{entry.title}</h3>
                {isReflection && entry.reflectionPeriod && (
                  <Badge variant="secondary">
                    {t(`reflectionPeriods.${entry.reflectionPeriod}` as 'reflectionPeriods.day')}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground line-clamp-2">{entry.content}</p>

              <TagSelector entryId={entry.id} tagIds={tagIds} />

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock size={16} />
                <span>
                  {new Date(entry.date).toLocaleDateString(
                    locale === 'ru' ? 'ru-RU' : 'en-US',
                    {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }
                  )}
                </span>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
                  onClick={() => setIsDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tCommon('delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('deleteEntryTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              {t('deleteEntryDescription', { title: entry.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteJournalEntry(entry.id)}
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
