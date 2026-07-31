'use client';

import { buildHabitFormValues } from '@/features/habit/lib/habit-form-initial-values';
import type { HabitFrequencyKey } from '@/features/habit/lib/habit-frequency';
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
  const { addHabit, habitFormDraft } = useStore();
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');

  const frequencyLabels: Record<HabitFrequencyKey, string> = {
    daily: t('frequencies.daily'),
    threePerWeek: t('frequencies.threePerWeek'),
    fivePerWeek: t('frequencies.fivePerWeek'),
    weekends: t('frequencies.weekends'),
  };

  const initialValues = buildHabitFormValues(habitFormDraft);

  const [name, setName] = useState(initialValues.name);
  const [frequency, setFrequency] = useState<HabitFrequencyKey>(initialValues.frequency);

  useEffect(() => {
    if (!open) return;

    const nextValues = buildHabitFormValues(habitFormDraft);
    setName(nextValues.name);
    setFrequency(nextValues.frequency);
  }, [open, habitFormDraft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await addHabit({
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
          <Select value={frequency} onValueChange={(value) => setFrequency(value as HabitFrequencyKey)}>
            <SelectTrigger id="frequency" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(frequencyLabels) as HabitFrequencyKey[]).map((key) => (
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
