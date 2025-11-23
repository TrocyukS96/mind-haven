'use client';

import { cn } from '@/shared/lib/utils';
import { Input } from '@/shared/ui/input';
import { Search, X } from 'lucide-react';
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
    placeholder = 'Поиск по названию или описанию...',
    className = '',
}: GoalsSearchProps) {
    const [localValue, setLocalValue] = useState(value);

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
<div className={cn('relative h-[36px]', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

      <Input
        type="text"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        className="pl-10 pr-10 bg-background"
      />

      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Очистить поиск"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
    );
}