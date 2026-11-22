'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import { TaskCard } from '@/entities/task/ui/TaskCard';
import type { Task } from '@/entities/task/model/types';
import { cn } from '@/shared/lib/utils';
import { KanbanItemSortableProvider } from '@/shared/ui/kanban-item-sortable';

export function ProjectStepsList({
  steps,
  onReorder,
}: {
  steps: Task[];
  onReorder: (visibleOrderedIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (steps.length < 2) {
    return (
      <ul className="space-y-1">
        {steps.map((step) => (
          <li key={step.id}>
            <TaskCard task={step} variant="step" showMeta />
          </li>
        ))}
      </ul>
    );
  }

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = steps.map((step) => step.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    onReorder(arrayMove(ids, oldIndex, newIndex));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1">
          {steps.map((step) => (
            <SortableStep key={step.id} step={step} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableStep({ step }: { step: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <KanbanItemSortableProvider value={{ attributes, listeners, isDragging }}>
      <li
        ref={setNodeRef}
        style={style}
        className={cn('min-w-0', isDragging && 'relative z-10 rounded-lg bg-card opacity-80 shadow-md')}
      >
        <TaskCard task={step} variant="step" showMeta />
      </li>
    </KanbanItemSortableProvider>
  );
}
