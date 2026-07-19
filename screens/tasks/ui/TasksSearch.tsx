'use client';

import { Input } from '@/shared/ui/input';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/shared/lib/utils';

interface TasksSearchProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function TasksSearch({ value, onChange, className }: TasksSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const t = useTranslations('tasks');

  return (
    <div className={cn('relative h-9 w-[350px]', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder={t('searchPlaceholder')}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          onChange(e.target.value);
        }}
        className="pl-10 pr-10"
      />
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
