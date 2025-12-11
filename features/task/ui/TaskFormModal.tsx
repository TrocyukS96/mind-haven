'use client';

import { Task } from '@/entities/task/model/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { TaskForm } from './TaskForm';

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskFormModal = ({ task, open, onOpenChange }: Props) => {
  const isEdit = !!task;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Редактировать задачу' : 'Новая задача'}
          </DialogTitle>
        </DialogHeader>

        <TaskForm task={task} open={open} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}

export default TaskFormModal;