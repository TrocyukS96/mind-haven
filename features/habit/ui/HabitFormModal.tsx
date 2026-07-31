'use client';

import { getHabitFormKey } from '@/features/habit/lib/habit-form-initial-values';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { HabitForm } from './HabitForm';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HabitFormModal = ({ open, onOpenChange }: Props) => {
  const { isHabitFormOpen, closeHabitForm, habitFormDraft } = useStore();
  const t = useTranslations('habits');
  const formKey = getHabitFormKey(habitFormDraft);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">{t('newHabit')}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">
          <HabitForm
            key={formKey}
            open={isHabitFormOpen}
            onOpenChange={(isOpen) => !isOpen && closeHabitForm()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HabitFormModal;
