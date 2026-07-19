'use client';

import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { DialogFooter } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';

type FrequencyKey = 'daily' | 'threePerWeek' | 'fivePerWeek' | 'weekends';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FormField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function HabitForm({ open, onOpenChange }: Props) {
  const { addHabit } = useStore();
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');

  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<FrequencyKey>('daily');

  const frequencyLabels: Record<FrequencyKey, string> = {
    daily: t('frequencies.daily'),
    threePerWeek: t('frequencies.threePerWeek'),
    fivePerWeek: t('frequencies.fivePerWeek'),
    weekends: t('frequencies.weekends'),
  };

  useEffect(() => {
    if (open) {
      setName('');
      setFrequency('daily');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addHabit({
      name: name.trim(),
      frequency: frequencyLabels[frequency],
    });

    onOpenChange(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-4">
        <FormField label={t('habitName')} htmlFor="habit-name">
          <Input
            id="habit-name"
            placeholder={t('habitNamePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="h-10"
          />
        </FormField>

        <FormField label={t('frequency')}>
          <Select value={frequency} onValueChange={(value) => setFrequency(value as FrequencyKey)}>
            <SelectTrigger id="frequency" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(frequencyLabels) as FrequencyKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {frequencyLabels[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <DialogFooter className="gap-2 px-0 pt-0 sm:gap-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit">{t('createHabit')}</Button>
      </DialogFooter>
    </form>
  );
}
