'use client';

import { useEffect, useState } from 'react';
import { JournalEntry, JournalEntryType } from '@/entities/journal/model/types';
import { JournalTitleCombobox } from './JournalTitleCombobox';
import { ReflectionForm } from './ReflectionForm';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { useTranslations } from 'next-intl';

interface Props {
  entry?: JournalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toDateString(value?: string): string {
  if (!value) return new Date().toISOString().split('T')[0];
  return value.split('T')[0];
}

function FreeEntryForm({
  entry,
  open,
  onOpenChange,
}: {
  entry?: JournalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { journalTags, addJournalEntry, updateJournalEntry, addJournalTag } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState('');
  const [selectedTagId, setSelectedTagId] = useState('none');
  const [newTagName, setNewTagName] = useState('');
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');
  const isEditMode = Boolean(entry);

  useEffect(() => {
    if (!open) return;

    if (entry) {
      setTitle(entry.title);
      setContent(entry.content);
      setDate(entry.date);
      const firstTagId = entry.tagIds?.[0];
      setSelectedTagId(firstTagId ?? 'none');
      setNewTagName('');
    } else {
      setTitle('');
      setContent('');
      setDate('');
      setSelectedTagId('none');
      setNewTagName('');
    }
  }, [entry, open]);

  const resolveTagIds = (): string[] => {
    const trimmed = newTagName.trim();
    if (trimmed) {
      return [addJournalTag(trimmed)];
    }
    if (selectedTagId !== 'none') {
      return [selectedTagId];
    }
    return [];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const tagIds = resolveTagIds();
    const finalDate = toDateString(date);

    if (isEditMode && entry) {
      updateJournalEntry(entry.id, {
        title: title.trim(),
        content: content.trim(),
        date: finalDate,
        entryType: 'free',
        tagIds: tagIds.length > 0 ? tagIds : (entry.tagIds ?? []),
      });
    } else {
      addJournalEntry({
        title: title.trim(),
        content: content.trim(),
        date: finalDate,
        tagIds,
        entryType: 'free',
      });
    }

    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="journal-title">{t('entryTitle')}</Label>
        <JournalTitleCombobox
          id="journal-title"
          value={title}
          onChange={setTitle}
          placeholder={t('entryTitlePlaceholder')}
        />
      </div>

      <div>
        <Label htmlFor="journal-content">{t('entryContent')}</Label>
        <Textarea
          id="journal-content"
          placeholder={t('entryContentPlaceholder')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          required
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('tag')}</Label>
          <Select value={selectedTagId} onValueChange={setSelectedTagId}>
            <SelectTrigger>
              <SelectValue placeholder={t('noTag')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noTag')}</SelectItem>
              {journalTags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder={t('tagNamePlaceholder')}
          />
        </div>

        <DatePicker
          id="journal-date"
          label={t('entryDate')}
          value={date}
          onChange={setDate}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit">
          {isEditMode ? tCommon('save') : t('createEntry')}
        </Button>
      </div>
    </form>
  );
}

export function JournalForm({ entry, open, onOpenChange }: Props) {
  const [entryType, setEntryType] = useState<JournalEntryType>('free');
  const t = useTranslations('journal');

  const isEditMode = Boolean(entry);
  const resolvedType =
    isEditMode && entry?.entryType === 'reflection' ? 'reflection' : entryType;

  useEffect(() => {
    if (!open) return;

    if (entry?.entryType === 'reflection') {
      setEntryType('reflection');
    } else {
      setEntryType('free');
    }
  }, [entry, open]);

  return (
    <div className="space-y-6">
      {!isEditMode && (
        <div>
          <Label>{t('entryType')}</Label>
          <Select
            value={entryType}
            onValueChange={(value) => setEntryType(value as JournalEntryType)}
          >
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">{t('entryTypes.free')}</SelectItem>
              <SelectItem value="reflection">{t('entryTypes.reflection')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {resolvedType === 'reflection' ? (
        <ReflectionForm entry={entry} open={open} onOpenChange={onOpenChange} />
      ) : (
        <FreeEntryForm entry={entry} open={open} onOpenChange={onOpenChange} />
      )}
    </div>
  );
}
