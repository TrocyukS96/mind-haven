'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface CreateHabitFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

export function CreateHabitForm({ onCancel, onSuccess }: CreateHabitFormProps) {
  const { addHabit } = useStore();
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('daily');

  const frequencyValues = {
    daily: t('frequencies.daily'),
    threePerWeek: t('frequencies.threePerWeek'),
    fivePerWeek: t('frequencies.fivePerWeek'),
    weekends: t('frequencies.weekends'),
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      addHabit({
        name,
        frequency: frequencyValues[frequency as keyof typeof frequencyValues],
      });
      setName('');
      setFrequency('daily');
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('newHabit')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('habitName')}</label>
            <Input
              placeholder={t('habitNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('frequency')}</label>
            <Select value={frequency} onValueChange={(value) => setFrequency(value)}>
              <option value="daily">{t('frequencies.daily')}</option>
              <option value="threePerWeek">{t('frequencies.threePerWeek')}</option>
              <option value="fivePerWeek">{t('frequencies.fivePerWeek')}</option>
              <option value="weekends">{t('frequencies.weekends')}</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit">{t('createHabit')}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
