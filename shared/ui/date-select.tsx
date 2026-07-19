'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Input } from '@/shared/ui/input';
import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { getDateLocale } from '@/shared/lib/date-locale';
import { useLocale, useTranslations } from 'next-intl';

interface DateSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function DateSelect({ value, onChange }: DateSelectProps) {
  const [selectValue, setSelectValue] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations('datePicker');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  const handleSelect = (val: string) => {
    setSelectValue(val);
    if (val === 'custom') {
      dateInputRef.current?.showPicker?.();
      dateInputRef.current?.focus();
    }
  };

  const displayValue = value
    ? format(new Date(value), 'd MMM yyyy', { locale: dateLocale })
    : selectValue || t('selectDeadline');

  return (
    <div className="relative">
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder={t('selectDeadline')}>{displayValue}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">{t('today')}</SelectItem>
          <SelectItem value="week">{t('thisWeek')}</SelectItem>
          <SelectItem value="month">{t('thisMonth')}</SelectItem>
          <SelectItem value="quarter">{t('thisQuarter')}</SelectItem>
          <SelectItem value="year">{t('thisYear')}</SelectItem>
          <SelectItem value="custom">{t('custom')}</SelectItem>
        </SelectContent>
      </Select>

      <Input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value || undefined);
          setSelectValue('');
        }}
        className="absolute inset-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}
