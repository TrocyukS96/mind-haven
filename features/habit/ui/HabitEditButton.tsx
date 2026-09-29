'use client';

import type { Habit } from '@/entities/habit/model/types';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface Props {
  habit: Habit;
  className?: string;
}

export function HabitEditButton({ habit, className }: Props) {
  const { openHabitForm } = useStore();
  const t = useTranslations('common');

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-8 shrink-0 text-muted-foreground hover:text-foreground', className)}
      aria-label={t('edit')}
      onClick={() => openHabitForm(habit)}
    >
      <Pencil size={16} />
    </Button>
  );
}
