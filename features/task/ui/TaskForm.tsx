'use client';

import { Task, TaskPriority, TaskType } from '@/entities/task/model/types';
import { useItemTypes } from '@/features/item-types';
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
  const { goals, addTask, updateTask, defaultGoalId, defaultDeadline, taskFormDraft } = useStore();
  const { getEnabledTypes, getDefaultTypeKey } = useItemTypes();
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
  const [type, setType] = useState<TaskType>(initialValues.type);
  const [goalId, setGoalId] = useState<string>(initialValues.goalId);
  const [completed, setCompleted] = useState(initialValues.completed);
  const [deadline, setDeadline] = useState(initialValues.deadline);
  const [subtasks, setSubtasks] = useState<string[]>(initialValues.subtasks);

  const isEditMode = !!task;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalGoalId = goalId === 'none' ? undefined : goalId;
    const finalDeadline = deadline || undefined;
    const finalDescription = description.trim() || undefined;

    if (isEditMode && task) {
      updateTask(task.id, {
        title: title.trim(),
        description: finalDescription,
        priority,
        type,
        goalId: finalGoalId,
        deadline: finalDeadline,
      });
    } else {
      addTask(title.trim(), finalGoalId, priority, finalDeadline, type, finalDescription);

      subtasks
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((subtaskTitle) => {
          addTask(subtaskTitle, finalGoalId, priority, finalDeadline, type);
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
    setType(nextValues.type);
    setGoalId(nextValues.goalId);
    setCompleted(nextValues.completed);
    setDeadline(nextValues.deadline);
    setSubtasks(nextValues.subtasks);
  }, [task, open, defaultGoalId, defaultDeadline, taskFormDraft, defaultType]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">{t('taskType')}</Label>
          <Select key={`type-${type}`} value={type} onValueChange={(v) => setType(v)}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskTypes.map((taskType) => (
                <SelectItem key={taskType.key} value={taskType.key}>
                  {taskType.label || t(`types.${taskType.key}` as 'types.short')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">{t('priority')}</Label>
          <Select
            key={`priority-${priority}`}
            value={priority}
            onValueChange={(v) => setPriority(v as TaskPriority)}
          >
            <SelectTrigger className="mt-2">
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

        <div className="space-y-2">
          <Label htmlFor="deadline">{tCommon('deadline')}</Label>
          <DatePicker
            id="deadline"
            value={deadline}
            onChange={(date) => setDeadline(date)}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="goal">{t('linkToGoal')}</Label>
        <Select value={goalId} onValueChange={setGoalId}>
          <SelectTrigger className="mt-2">
            <SelectValue placeholder={t('noGoal')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t('noGoal')}</SelectItem>
            {goals.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {goal.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
