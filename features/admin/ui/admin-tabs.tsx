'use client';

import { cn } from '@/shared/lib/utils';

export interface AdminTab<T extends string> {
  value: T;
  label: string;
}

interface AdminTabsProps<T extends string> {
  tabs: AdminTab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  size?: 'md' | 'sm';
}

export function AdminTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
  size = 'md',
}: AdminTabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex flex-wrap gap-x-1 border-b border-border"
    >
      {tabs.map((tab) => {
        const selected = value === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            id={`admin-tab-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            className={cn(
              'border-b-2 -mb-px font-medium transition-colors cursor-pointer',
              size === 'md' ? 'px-3 py-2.5 text-sm' : 'px-2.5 py-1.5 text-xs sm:text-sm',
              selected
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            onClick={() => onChange(tab.value)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
