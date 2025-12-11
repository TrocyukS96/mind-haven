// components/modal-provider.tsx  ← отдельный клиентский компонент
'use client';

import { GoalFormModal } from '@/features/goal';
import { useStore } from '@/shared/store/store-config';
import { TaskFormModal } from '@/features/task';
export function ModalProvider() {
  const { isGoalFormOpen, closeGoalForm, isTaskFormOpen, closeTaskForm } = useStore();

  return (
    <>
      <GoalFormModal
        open={isGoalFormOpen}
        onOpenChange={(open) => !open && closeGoalForm()}
      />

      <TaskFormModal
        open={isTaskFormOpen}
        onOpenChange={(open) => !open && closeTaskForm()}
      />
    </>
  );
}