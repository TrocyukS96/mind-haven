'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { GoalForm } from './GoalForm';
import { useStore } from '@/shared/store/store-config';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GoalFormModal = ({ open, onOpenChange }: Props) => {
  const { selectedGoal, isGoalFormOpen, openGoalForm, closeGoalForm } = useStore();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {selectedGoal ? 'Редактировать цель' : 'Новая цель (SMART)'}
          </DialogTitle>
        </DialogHeader>

        <GoalForm
          goal={selectedGoal}
          open={isGoalFormOpen}
          onOpenChange={(open) => !open && closeGoalForm()}
        />
      </DialogContent>
    </Dialog>
  );
}

export default GoalFormModal;