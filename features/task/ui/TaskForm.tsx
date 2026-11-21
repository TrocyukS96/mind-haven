'use client';

import { Task, TaskPriority, TaskType } from '@/entities/task/model/types';
import { useItemTypes } from '@/features/item-types';
import { getItemTypeOptionLabel } from '@/shared/config/item-types';
import {
  buildTaskFormValues,
} from '@/features/task/lib/task-form-initial-values';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { DatePicker } from '@/shared/ui/date-picker';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskForm = ({ task, open, onOpenChange }: Props) => {
  const {
    goals,
    projects,
    taskColumns,
    addTask,
    updateTask,
    defaultGoalId,
    defaultProjectId,
    defaultColumnId,
    defaultDeadline,
    taskFormDraft,
  } = useStore();
  const { getEnabledTypes, getDefaultTypeKey, resolveType } = useItemTypes();
  const taskTypes = getEnabledTypes('tasks');
  const defaultType = getDefaultTypeKey('tasks');
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');

  const initialValues = buildTaskFormValues({
    task,
    draft: taskFormDraft,
    defaultGoalId,
    defaultDeadline,
    defaultType,
  });

  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [priority, setPriority] = useState<TaskPriority>(initialValues.priority);
  const [type, setType] = useState<TaskType>(() => resolveType('tasks', initialValues.type));
  const [goalId, setGoalId] = useState<string>(initialValues.goalId);
  const [completed, setCompleted] = useState(initialValues.completed);
  const [deadline, setDeadline] = useState(initialValues.deadline);
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? 'none');
  const [columnId, setColumnId] = useState<string>(defaultColumnId ?? 'none');
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>(
    task?.estimatedMinutes ? String(task.estimatedMinutes) : ''
  );
  const [subtasks, setSubtasks] = useState<string[]>(initialValues.subtasks);

  const isEditMode = !!task;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalGoalId = goalId === 'none' ? undefined : goalId;
    const finalProjectId = projectId === 'none' ? undefined : projectId;
    const finalColumnId = columnId === 'none' ? undefined : columnId;
    const finalDeadline = deadline || undefined;
    const finalDescription = description.trim() || undefined;
    const parsedMinutes = estimatedMinutes.trim() ? Number(estimatedMinutes) : undefined;
    const finalMinutes =
      parsedMinutes !== undefined && Number.isFinite(parsedMinutes)
        ? Math.max(0, Math.round(parsedMinutes))
        : undefined;

    if (isEditMode && task) {
      updateTask(task.id, {
        title: title.trim(),
        description: finalDescription,
        priority,
        type,
        goalId: finalGoalId,
        projectId: finalProjectId,
        columnId: finalColumnId,
        estimatedMinutes: finalMinutes,
        deadline: finalDeadline,
      });
    } else {
      addTask(
        title.trim(),
        finalGoalId,
        priority,
        finalDeadline,
        type,
        finalDescription,
        finalProjectId,
        finalColumnId,
        finalMinutes
      );

      subtasks
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((subtaskTitle) => {
          addTask(
            subtaskTitle,
            finalGoalId,
            priority,
            finalDeadline,
            type,
            undefined,
            finalProjectId,
            finalColumnId
          );
        });
    }

    onOpenChange(false);
  };

  const updateSubtask = (index: number, value: string) => {
    setSubtasks((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const removeSubtask = (index: number) => {
    setSubtasks((current) => current.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextValues = buildTaskFormValues({
      task,
      draft: taskFormDraft,
      defaultGoalId,
      defaultDeadline,
      defaultType,
    });

    setTitle(nextValues.title);
    setDescription(nextValues.description);
    setPriority(nextValues.priority);
    setType(resolveType('tasks', nextValues.type));
    setGoalId(nextValues.goalId);
    setCompleted(nextValues.completed);
    setDeadline(nextValues.deadline);
    setSubtasks(nextValues.subtasks);
    setProjectId(task?.projectId ?? defaultProjectId ?? 'none');
    setColumnId(task?.columnId ?? defaultColumnId ?? 'none');
    setEstimatedMinutes(task?.estimatedMinutes ? String(task.estimatedMinutes) : '');
  }, [task, open, defaultGoalId, defaultProjectId, defaultColumnId, defaultDeadline, taskFormDraft, defaultType, resolveType]);

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-6">
      <div>
        <Label htmlFor="title">{t('taskTitle')}</Label>
        <Input
          id="title"
          placeholder={t('taskTitlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="description">{t('taskDescription')}</Label>
        <Textarea
          id="description"
          placeholder={t('taskDescriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-2"
          rows={3}
        />
      </div>

      {subtasks.length > 0 && !isEditMode && (
        <div className="space-y-2">
          <Label>{t('subtasks')}</Label>
          <div className="space-y-2">
            {subtasks.map((subtask, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={subtask}
                  onChange={(e) => updateSubtask(index, e.target.value)}
                  placeholder={t('subtaskPlaceholder')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSubtask(index)}
                  aria-label={tCommon('delete')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <Label htmlFor="type">{t('taskType')}</Label>
          <Select key={`type-${type}`} value={type} onValueChange={(v) => setType(v)}>
            <SelectTrigger className="mt-2 w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskTypes.map((taskType) => (
                <SelectItem key={taskType.key} value={taskType.key}>
                  {getItemTypeOptionLabel(taskType, (key) => t(`types.${key}`))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0">
          <Label htmlFor="priority">{t('priority')}</Label>
          <Select
            key={`priority-${priority}`}
            value={priority}
            onValueChange={(v) => setPriority(v as TaskPriority)}
          >
            <SelectTrigger className="mt-2 w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{tPriorities('low')}</SelectItem>
              <SelectItem value="medium">{tPriorities('medium')}</SelectItem>
              <SelectItem value="high">{tPriorities('high')}</SelectItem>
              <SelectItem value="urgent">{tPriorities('urgentExclaim')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-0 space-y-2">
          <Label htmlFor="deadline">{tCommon('deadline')}</Label>
          <DatePicker
            id="deadline"
            value={deadline}
            onChange={(date) => setDeadline(date)}
          />
        </div>
      </div>

      <div className="min-w-0">
        <Label htmlFor="goal">{t('linkToGoal')}</Label>
        <Select value={goalId} onValueChange={setGoalId}>
          <SelectTrigger className="mt-2 w-full min-w-0">
            <SelectValue placeholder={t('noGoal')} />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            <SelectItem value="none">{t('noGoal')}</SelectItem>
            {goals.map((goal) => (
              <SelectItem
                key={goal.id}
                value={goal.id}
                className="h-auto whitespace-normal py-2 *:[span]:last:block *:[span]:last:whitespace-normal"
              >
                {goal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
        <div className="min-w-0">
          <Label>{t('linkToProject')}</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="mt-2 w-full min-w-0">
              <SelectValue placeholder={t('noProject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noProject')}</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {taskColumns.length > 0 ? (
          <div className="min-w-0">
            <Label>{t('kanbanColumn')}</Label>
            <Select value={columnId} onValueChange={setColumnId}>
              <SelectTrigger className="mt-2 w-full min-w-0">
                <SelectValue placeholder={t('defaultColumn')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('defaultColumn')}</SelectItem>
                {taskColumns
                  .filter((c) => !c.archivedAt && (!c.isHidden || c.id === columnId))
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((column) => (
                    <SelectItem key={column.id} value={column.id}>
                      {column.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div>
        <Label htmlFor="estimated">{t('estimatedMinutesLabel')}</Label>
        <Input
          id="estimated"
          type="number"
          min={0}
          step={5}
          className="mt-2"
          value={estimatedMinutes}
          onChange={(e) => setEstimatedMinutes(e.target.value)}
          placeholder="30"
        />
      </div>

      {isEditMode && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id="completed"
            checked={completed}
            onCheckedChange={(checked) => setCompleted(checked as boolean)}
          />
          <Label htmlFor="completed" className="cursor-pointer">
            {t('markCompleted')}
          </Label>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit">
          {isEditMode ? tCommon('save') : t('createTask')}
        </Button>
      </div>
    </form>
  );
};

export default TaskForm;
