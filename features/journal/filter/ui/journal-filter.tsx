'use client';

import { useState } from 'react';
import { Filter } from 'lucide-react';
import { JournalFilterState } from '@/entities/journal/model/types';
import { useStore } from '@/shared/store/store-config';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';

interface JournalFilterProps {
  filter: JournalFilterState;
  onApply: (filter: JournalFilterState) => void;
  onReset: () => void;
  isActive: boolean;
}

export function JournalFilter({ filter, onApply, onReset, isActive }: JournalFilterProps) {
  const { journalTags } = useStore();
  const [temp, setTemp] = useState(filter);
  const [open, setOpen] = useState(false);
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTemp(filter);
    }
    setOpen(nextOpen);
  };

  const handleApply = () => {
    onApply(temp);
    setOpen(false);
  };

  const handleReset = () => {
    const empty: JournalFilterState = { tagIds: [] };
    setTemp(empty);
    onReset();
    setOpen(false);
  };

  const toggleTag = (tagId: string) => {
    setTemp((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-9 w-9', isActive && 'text-primary bg-primary/10')}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{tCommon('from')}</Label>
            <Input
              type="date"
              value={temp.dateFrom || ''}
              onChange={(e) => setTemp({ ...temp, dateFrom: e.target.value || undefined })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tCommon('to')}</Label>
            <Input
              type="date"
              value={temp.dateTo || ''}
              onChange={(e) => setTemp({ ...temp, dateTo: e.target.value || undefined })}
            />
          </div>
        </div>

        {journalTags.length > 0 && (
          <div className="space-y-2">
            <Label>{t('filterByTags')}</Label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {journalTags.map((tag) => (
                <div key={tag.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`filter-tag-${tag.id}`}
                    checked={temp.tagIds.includes(tag.id)}
                    onCheckedChange={() => toggleTag(tag.id)}
                  />
                  <Label htmlFor={`filter-tag-${tag.id}`} className="cursor-pointer">
                    <Badge variant="secondary">{tag.name}</Badge>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleReset}>
            {tCommon('reset')}
          </Button>
          <Button onClick={handleApply}>{tCommon('apply')}</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
