'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { CreateGoalForm } from './CreateGoalForm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGoalModal = ({ open, onOpenChange }: Props) => {
  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Новая цель (SMART)</DialogTitle>
        </DialogHeader>

        <CreateGoalForm
          onCancel={() => onOpenChange(false)}
          onSuccess={handleSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}

export default CreateGoalModal;