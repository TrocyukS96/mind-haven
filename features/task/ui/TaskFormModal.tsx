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
import { useTranslations } from 'next-intl';

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskFormModal = ({ open, onOpenChange }: Props) => {
  const { selectedTask, isTaskFormOpen, closeTaskForm } = useStore();
  const t = useTranslations('tasks');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedTask ? t('editTask') : t('newTask')}
            </DialogTitle>
          </DialogHeader>

          <TaskForm
            task={selectedTask}
            open={isTaskFormOpen}
            onOpenChange={(isOpen) => !isOpen && closeTaskForm()}
          />
        </DialogContent>
      )}
    </Dialog>
  );
};

export default TaskFormModal;
