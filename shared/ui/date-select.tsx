'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Input } from "@/shared/ui/input";
import { useRef, useState } from "react";
import { format } from "date-fns";

interface DateSelectProps {
  value?: string;
  onChange: (value: string | undefined) => void;
}

export function DateSelect({ value, onChange }: DateSelectProps) {
  const [selectValue, setSelectValue] = useState<string>('');
  const dateInputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (val: string) => {
    setSelectValue(val);
    if (val === 'custom') {
      dateInputRef.current?.showPicker?.();
      dateInputRef.current?.focus();
    } else {
      // Логика предопределённых дат
      // onChange(calculatedDate);
    }
  };

  const displayValue = value
    ? format(new Date(value), 'd MMM yyyy')
    : selectValue || 'Выберите срок';

  return (
    <div className="relative">
      <Select value={selectValue} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue placeholder="Выберите срок">
            {displayValue}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Сегодня</SelectItem>
          <SelectItem value="week">Эта неделя</SelectItem>
          <SelectItem value="month">Этот месяц</SelectItem>
          <SelectItem value="quarter">Этот квартал</SelectItem>
          <SelectItem value="year">Этот год</SelectItem>
          <SelectItem value="custom">Настроить</SelectItem>
        </SelectContent>
      </Select>

      {/* Скрытый input date */}
      <Input
        ref={dateInputRef}
        type="date"
        value={value}
        onChange={(e) => {
          onChange(e.target.value || undefined);
          setSelectValue(''); // сбрасываем предопределённый выбор
        }}
        className="absolute inset-0 opacity-0 pointer-events-none"
      />
    </div>
  );
}