'use client';

import { Button } from '@/shared/ui/button';
import { Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { TaskPriority } from '@/entities/task/model/types';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface TasksFilterProps {
  filter: FilterState;
  onApply: (filter: FilterState) => void;
  onReset: () => void;
  isActive: boolean;
}

type FilterState = {
  priority?: TaskPriority | 'all';
  overdue?: boolean;
  dateFrom?: string;
  dateTo?: string;
};

export function TasksFilter({ filter, onApply, onReset, isActive }: TasksFilterProps) {
  const [temp, setTemp] = useState(filter);
  const [open, setOpen] = useState(false);
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');

  const handleApply = () => {
    onApply(temp);
    setOpen(false);
  };

  const handleReset = () => {
    setTemp({ priority: 'all' });
    onReset();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
        <div className="space-y-2">
          <Label>{t('priority')}</Label>
          <Select
            value={temp.priority || 'all'}
            onValueChange={(v) => setTemp({ ...temp, priority: v as TaskPriority | 'all' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tCommon('all')}</SelectItem>
              <SelectItem value="low">{tPriorities('low')}</SelectItem>
              <SelectItem value="medium">{tPriorities('medium')}</SelectItem>
              <SelectItem value="high">{tPriorities('high')}</SelectItem>
              <SelectItem value="urgent">{tPriorities('urgent')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            checked={temp.overdue || false}
            onCheckedChange={(c) => setTemp({ ...temp, overdue: c as boolean })}
          />
          <Label className="cursor-pointer">{t('overdue')}</Label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{tCommon('from')}</Label>
            <Input
              type="date"
              value={temp.dateFrom || ''}
              onChange={(e) => setTemp({ ...temp, dateFrom: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>{tCommon('to')}</Label>
            <Input
              type="date"
              value={temp.dateTo || ''}
              onChange={(e) => setTemp({ ...temp, dateTo: e.target.value })}
            />
          </div>
        </div>

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
