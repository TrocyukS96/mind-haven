'use client';

import { GoalFormModal } from '@/features/goal';
import { HabitFormModal } from '@/features/habit';
import { JournalFormModal } from '@/features/journal';
import { useStore } from '@/shared/store/store-config';
import { TaskFormModal } from '@/features/task';

export function ModalProvider() {
  const {
    isGoalFormOpen,
    closeGoalForm,
    isTaskFormOpen,
    closeTaskForm,
    isJournalFormOpen,
    closeJournalForm,
    isHabitFormOpen,
    closeHabitForm,
  } = useStore();

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

      <JournalFormModal
        open={isJournalFormOpen}
        onOpenChange={(open) => !open && closeJournalForm()}
      />

      <HabitFormModal
        open={isHabitFormOpen}
        onOpenChange={(open) => !open && closeHabitForm()}
      />
    </>
  );
}