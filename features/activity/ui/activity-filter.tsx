'use client';

import { Filter } from 'lucide-react';
import { useState } from 'react';
import {
  DATE_PRESETS,
  DEFAULT_ACTIVITY_FILTER,
  type ActivityCategory,
  type ActivityFilterState,
  type DatePreset,
} from '@/entities/activity/model/types';
import { getActivityFilterCategories } from '@/entities/activity/model/catalog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';

interface ActivityFilterProps {
  filter: ActivityFilterState;
  onApply: (filter: ActivityFilterState) => void;
  onReset: () => void;
  isActive: boolean;
}

export function ActivityFilter({ filter, onApply, onReset, isActive }: ActivityFilterProps) {
  const [temp, setTemp] = useState(filter);
  const [open, setOpen] = useState(false);
  const t = useTranslations('activity');
  const tJournal = useTranslations('journal');
  const tCommon = useTranslations('common');
  const categories = getActivityFilterCategories();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setTemp(filter);
    }
    setOpen(nextOpen);
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
      <PopoverContent
        align="end"
        className="w-[min(20rem,calc(100vw-2rem))] space-y-4 p-4 sm:w-80"
      >
        <div className="space-y-2">
          <Label>{tJournal('filterByDate')}</Label>
          <Select
            value={temp.datePreset}
            onValueChange={(value: DatePreset) =>
              setTemp((prev) => ({
                ...prev,
                datePreset: value,
                ...(value !== 'custom' ? { dateFrom: undefined, dateTo: undefined } : {}),
              }))
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_PRESETS.map((preset) => (
                <SelectItem key={preset} value={preset}>
                  {tJournal(`datePresets.${preset}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {temp.datePreset === 'custom' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        )}

        <div className="space-y-2">
          <Label>{t('filterType')}</Label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTemp((prev) => ({ ...prev, category: 'all' }))}
            >
              <Badge variant={temp.category === 'all' ? 'default' : 'secondary'}>
                {t('types.all')}
              </Badge>
            </button>
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() =>
                  setTemp((prev) => ({
                    ...prev,
                    category: category as ActivityCategory,
                  }))
                }
              >
                <Badge variant={temp.category === category ? 'default' : 'secondary'}>
                  {t(`types.${category}`)}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setTemp(DEFAULT_ACTIVITY_FILTER);
              onReset();
              setOpen(false);
            }}
          >
            {tCommon('reset')}
          </Button>
          <Button
            onClick={() => {
              onApply(temp);
              setOpen(false);
            }}
          >
            {tCommon('apply')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
