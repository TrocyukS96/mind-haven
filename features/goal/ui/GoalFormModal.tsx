'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { GoalForm } from './GoalForm';
import { getGoalFormKey } from '@/features/goal/lib/goal-form-initial-values';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GoalFormModal = ({ open, onOpenChange }: Props) => {
  const { selectedGoal, isGoalFormOpen, closeGoalForm, goalFormDraft } = useStore();
  const t = useTranslations('goals');
  const formKey = getGoalFormKey(selectedGoal, goalFormDraft);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">
            {selectedGoal ? t('editGoal') : t('newGoal')}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(100vh-10rem)] overflow-y-auto px-6 py-5">
          <GoalForm
            key={formKey}
            goal={selectedGoal}
            open={isGoalFormOpen}
            onOpenChange={(isOpen) => !isOpen && closeGoalForm()}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoalFormModal;
