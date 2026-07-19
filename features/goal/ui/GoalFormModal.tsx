'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { GoalForm } from './GoalForm';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GoalFormModal = ({ open, onOpenChange }: Props) => {
  const { selectedGoal, isGoalFormOpen, closeGoalForm } = useStore();
  const t = useTranslations('goals');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {selectedGoal ? t('editGoal') : t('newGoal')}
          </DialogTitle>
        </DialogHeader>

        <GoalForm
          goal={selectedGoal}
          open={isGoalFormOpen}
          onOpenChange={(isOpen) => !isOpen && closeGoalForm()}
        />
      </DialogContent>
    </Dialog>
  );
};

export default GoalFormModal;
