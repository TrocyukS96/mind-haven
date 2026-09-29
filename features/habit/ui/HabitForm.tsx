'use client';

import {
  HABIT_TRACKING_TYPES,
  type HabitTrackingType,
} from '@/entities/habit/model/tracking-type';
import { buildHabitFormValues } from '@/features/habit/lib/habit-form-initial-values';
import type { HabitFrequencyKey } from '@/features/habit/lib/habit-frequency';
import {
  encodeHabitWeekdays,
  HABIT_WEEKDAY_MESSAGE_KEY,
  HABIT_WEEKDAY_ORDER,
} from '@/shared/lib/habit/habit-weekdays';
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
  const { addHabit, updateHabit, habitFormDraft, editingHabit } = useStore();
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');

  const frequencyLabels: Record<HabitFrequencyKey, string> = {
    daily: t('frequencies.daily'),
    weekly: t('frequencies.weekly'),
    monthly: t('frequencies.monthly'),
    yearly: t('frequencies.yearly'),
    weekends: t('frequencies.weekends'),
    custom: t('frequencies.custom'),
  };

  const initialValues = buildHabitFormValues({ draft: habitFormDraft, habit: editingHabit });

  const [name, setName] = useState(initialValues.name);
  const [frequency, setFrequency] = useState<HabitFrequencyKey>(initialValues.frequency);
  const [trackingType, setTrackingType] = useState<HabitTrackingType>(initialValues.trackingType);
  const [targetCount, setTargetCount] = useState(initialValues.targetCount);
  const [weekdays, setWeekdays] = useState<number[]>(initialValues.weekdays);

  useEffect(() => {
    if (!open) return;

    const nextValues = buildHabitFormValues({ draft: habitFormDraft, habit: editingHabit });
    setName(nextValues.name);
    setFrequency(nextValues.frequency);
    setTrackingType(nextValues.trackingType);
    setTargetCount(nextValues.targetCount);
    setWeekdays(nextValues.weekdays);
  }, [open, habitFormDraft, editingHabit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let parsedTarget: number | null = null;
    if (trackingType !== 'check') {
      parsedTarget = Number(targetCount);
      if (!Number.isInteger(parsedTarget) || parsedTarget < 1) return;
    }

    if (frequency === 'custom' && weekdays.length === 0) return;

    const payload = {
      name: name.trim(),
      frequency: frequency === 'custom' ? encodeHabitWeekdays(weekdays) : frequencyLabels[frequency],
      trackingType,
      targetCount: parsedTarget,
    };

    if (editingHabit) {
      await updateHabit(editingHabit.id, payload);
    } else {
      await addHabit(payload);
    }

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

        {frequency === 'custom' ? (
          <FormField label={t('weekdaysLabel')}>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_WEEKDAY_ORDER.map((day) => {
                const selected = weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={selected}
                    onClick={() =>
                      setWeekdays((current) =>
                        selected ? current.filter((item) => item !== day) : [...current, day]
                      )
                    }
                    className={cn(
                      'h-9 min-w-10 rounded-md border px-2 text-sm font-medium transition-colors',
                      selected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-foreground hover:border-primary hover:bg-primary/5'
                    )}
                  >
                    {t(`weekdays.${HABIT_WEEKDAY_MESSAGE_KEY[day]}`)}
                  </button>
                );
              })}
            </div>
          </FormField>
        ) : null}

        <FormField label={t('trackingType')}>
          <Select
            value={trackingType}
            onValueChange={(value) => setTrackingType(value as HabitTrackingType)}
          >
            <SelectTrigger id="habit-type" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HABIT_TRACKING_TYPES.map((key) => (
                <SelectItem key={key} value={key}>
                  {t(`trackingTypes.${key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        {trackingType !== 'check' ? (
          <FormField label={t('goal')} htmlFor="habit-target">
            <Input
              id="habit-target"
              type="number"
              min={1}
              step={1}
              inputMode="numeric"
              placeholder={t(`goalPlaceholders.${trackingType}`)}
              value={targetCount}
              onChange={(e) => setTargetCount(e.target.value)}
              required
              className="h-10"
            />
          </FormField>
        ) : null}
      </div>

      <DialogFooter className="gap-2 px-0 pt-0 sm:gap-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={frequency === 'custom' && weekdays.length === 0}>
          {editingHabit ? tCommon('save') : t('createHabit')}
        </Button>
      </DialogFooter>
    </form>
  );
}
