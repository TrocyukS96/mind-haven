'use client';

import { Task } from '@/entities/task/model/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import TaskForm from './TaskForm';
import { getTaskFormKey } from '@/features/task/lib/task-form-initial-values';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskFormModal = ({ open, onOpenChange }: Props) => {
  const { selectedTask, isTaskFormOpen, closeTaskForm, taskFormDraft } = useStore();
  const t = useTranslations('tasks');
  const formKey = getTaskFormKey(selectedTask, taskFormDraft);

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
            key={formKey}
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
