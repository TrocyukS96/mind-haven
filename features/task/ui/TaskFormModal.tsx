'use client';

import { Task } from '@/entities/task/model/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import TaskForm from './TaskForm';
import { useStore } from '@/shared/store/store-config';

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskFormModal = ({ open, onOpenChange }: Props) => {
  const { selectedTask, isTaskFormOpen, openTaskForm, closeTaskForm } = useStore();

  console.log(selectedTask,'selectedTask');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedTask ? 'Редактировать задачу' : 'Новая задача'}
          </DialogTitle>
        </DialogHeader>

        <TaskForm  task={selectedTask} open={isTaskFormOpen} onOpenChange={(open) => !open && closeTaskForm()} />
      </DialogContent>
    </Dialog>
  );
}

export default TaskFormModal;