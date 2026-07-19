'use client';

import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState, useEffect } from 'react';

interface GoalsSearchProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function GoalsSearch({
  value = '',
  onChange,
  placeholder,
  className = '',
}: GoalsSearchProps) {
  const [localValue, setLocalValue] = useState(value);
  const t = useTranslations('goals');

  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <div className={cn('relative h-9 w-[350px]', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

      <Input
        type="text"
        placeholder={placeholder ?? t('searchPlaceholder')}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-10 pr-10 bg-background"
      />

      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={t('clearSearch')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
