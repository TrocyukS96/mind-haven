'use client';

import * as React from 'react';
import { ChevronDownIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Calendar } from '@/shared/ui/calendar';
import { Label } from '@/shared/ui/label';
import { Popover, PopoverTrigger, PopoverContent } from './popover';
import { useEffect } from 'react';
import { getDateLocale } from '@/shared/lib/date-locale';
import { cn } from '@/shared/lib/utils';
import { useLocale, useTranslations } from 'next-intl';

interface Props {
  value: string;
  label?: string;
  id: string;
  onChange: (date: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function DatePicker({
  value,
  label,
  id,
  onChange,
  className,
  triggerClassName,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const t = useTranslations('datePicker');
  const locale = useLocale();
  const dateLocale = getDateLocale(locale);

  useEffect(() => {
    if (value) {
      setDate(new Date(value));
    }
  }, [value]);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <Label htmlFor={id} className="px-1">
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id={id}
            className={cn('w-full justify-between font-normal', triggerClassName)}
          >
            {date
              ? date.toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US')
              : t('selectDate')}
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            locale={dateLocale}
            selected={date ? new Date(date) : undefined}
            captionLayout="dropdown"
            onSelect={(valueDate: Date | undefined) => {
              if (valueDate) {
                setDate(valueDate);
                onChange(valueDate.toISOString());
              }
              setOpen(false);
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
