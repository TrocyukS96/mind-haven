'use client';

import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { Task } from '@/entities/task/model/types';
import { taskColumnErrorText } from '@/features/task/lib/task-column-error';
import { TaskColumnToolbar } from '@/features/task/ui/task-column-toolbar';
import { TaskColumnsDndBoard } from '@/features/task/ui/task-columns-dnd';
import { isPastWeekColumn, mergeReorderedVisibleColumns } from '@/shared/lib/planner/week-column-range';
import { useStore } from '@/shared/store/store-config';
import { KanbanBoard } from '@/shared/ui/kanban-board';
import { Button } from '@/shared/ui/button';
import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';

interface TaskKanbanBoardProps {
  tasks: Task[];
  projectFilter?: string;
  goalFilter?: string;
}

export function TaskKanbanBoard({ tasks, projectFilter, goalFilter }: TaskKanbanBoardProps) {
  const t = useTranslations('tasks');
  const taskColumns = useStore((state) => state.taskColumns);
  const moveTaskInKanban = useStore((state) => state.moveTaskInKanban);
  const moveTaskToColumn = useStore((state) => state.moveTaskToColumn);
  const reorderTaskColumns = useStore((state) => state.reorderTaskColumns);
  const updateTaskColumn = useStore((state) => state.updateTaskColumn);
  const tasksKanbanColumnOrder = useStore((state) => state.tasksKanbanColumnOrder);
  const reorderTasksKanbanColumns = useStore((state) => state.reorderTasksKanbanColumns);
  const [onlyCurrent, setOnlyCurrent] = useState(false);

  const activeColumns = useMemo(
    () =>
      [...taskColumns]
        .filter((column) => !column.archivedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt)),
    [taskColumns]
  );
  const visibleColumns = useMemo(
    () =>
      activeColumns.filter(
        (column) => !column.isHidden && (!onlyCurrent || !isPastWeekColumn(column))
      ),
    [activeColumns, onlyCurrent]
  );
  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (projectFilter && projectFilter !== 'all' && task.projectId !== projectFilter) return false;
        if (goalFilter && goalFilter !== 'all' && task.goalId !== goalFilter) return false;
        return true;
      }),
    [tasks, projectFilter, goalFilter]
  );

  const showAll = async () => {
    setOnlyCurrent(false);
    const hidden = activeColumns.filter((column) => column.isHidden);
    try {
      await Promise.all(hidden.map((column) => updateTaskColumn(column.id, { isHidden: false })));
    } catch (error) {
      toast.error(taskColumnErrorText(error, t, 'columns.saveColumnError'));
    }
  };

  return (
    <div className="space-y-3">
      <TaskColumnToolbar onlyCurrent={onlyCurrent} onOnlyCurrentChange={setOnlyCurrent} />
      {activeColumns.length === 0 ? (
        <KanbanBoard
          section="tasks"
          items={filteredTasks}
          getItemType={(task) => task.type}
          renderItem={(task) => (
            <TaskCard task={task} showGoalTitle showProjectTitle showType={false} />
          )}
          emptyMessage={t('noTasksYet')}
          draggable
          columnOrder={tasksKanbanColumnOrder}
          onColumnReorder={reorderTasksKanbanColumns}
          onItemMove={moveTaskInKanban}
        />
      ) : visibleColumns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t('columns.allColumnsHidden')}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void showAll()}>
            {t('columns.showAll')}
          </Button>
        </div>
      ) : (
        <TaskColumnsDndBoard
          columns={visibleColumns}
          resolveColumns={activeColumns}
          tasks={filteredTasks}
          onMoveTask={(taskId, columnId, targetIndex, visibleOrder) =>
            moveTaskToColumn(taskId, columnId, targetIndex, visibleOrder)
          }
          onReorderColumns={(visibleOrder) => {
            const sortedIds = activeColumns.map((column) => column.id);
            reorderTaskColumns(
              mergeReorderedVisibleColumns(
                sortedIds,
                visibleColumns.map((column) => column.id),
                visibleOrder
              )
            );
          }}
        />
      )}
    </div>
  );
}
