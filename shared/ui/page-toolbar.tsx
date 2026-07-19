'use client';

import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface PageToolbarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function PageToolbar({ left, center, right, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {left}
        {center}
      </div>
      {right && <div className="flex shrink-0 justify-end">{right}</div>}
    </div>
  );
}
