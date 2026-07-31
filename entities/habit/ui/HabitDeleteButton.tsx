'use client';

import { Habit } from '@/entities/habit/model/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/lib/utils';
import { useStore } from '@/shared/store/store-config';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { toast } from 'react-toastify';

interface Props {
  habit: Habit;
  className?: string;
}

export function HabitDeleteButton({ habit, className }: Props) {
  const { deleteHabit } = useStore();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const t = useTranslations('habits');
  const tCommon = useTranslations('common');

  const handleDelete = async () => {
    await deleteHabit(habit.id);
    toast.success(t('habitDeleted'));
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'size-8 shrink-0 text-muted-foreground hover:text-destructive',
          className
        )}
        aria-label={tCommon('delete')}
        onClick={() => setIsDeleteOpen(true)}
      >
        <Trash2 size={16} />
      </Button>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              {t('deleteHabitTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-2">
              {t('deleteHabitDescription', { name: habit.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
