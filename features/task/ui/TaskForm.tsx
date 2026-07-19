'use client';

import { Task, TaskPriority, TaskType } from '@/entities/task/model/types';
import { useItemTypes } from '@/features/item-types';
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
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface Props {
  task?: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TaskForm = ({ task, open, onOpenChange }: Props) => {
  const { goals, addTask, updateTask, defaultGoalId, defaultDeadline } = useStore();
  const { getEnabledTypes, getDefaultTypeKey } = useItemTypes();
  const taskTypes = getEnabledTypes('tasks');
  const t = useTranslations('tasks');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');

  const [title, setTitle] = useState(task?.title || '');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || 'medium');
  const [type, setType] = useState<TaskType>(task?.type || getDefaultTypeKey('tasks'));
  const [goalId, setGoalId] = useState<string>(task?.goalId || defaultGoalId || 'none');
  const [completed, setCompleted] = useState(task?.completed || false);
  const [deadline, setDeadline] = useState(task?.deadline || '');

  const isEditMode = !!task;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalGoalId = goalId === 'none' ? undefined : goalId;
    const finalDeadline = deadline || undefined;

    if (isEditMode && task) {
      updateTask(task.id, {
        title: title.trim(),
        priority,
        type,
        goalId: finalGoalId,
        deadline: finalDeadline,
      });
    } else {
      addTask(title.trim(), finalGoalId, priority, finalDeadline, type);
    }

    onOpenChange(false);
  };

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setPriority(task.priority);
        setType(task.type || getDefaultTypeKey('tasks'));
        setGoalId(task.goalId || 'none');
        setDeadline(task.deadline || '');
      } else {
        setTitle('');
        setPriority('medium');
        setType(getDefaultTypeKey('tasks'));
        setGoalId(defaultGoalId || 'none');
        setDeadline(defaultDeadline || '');
      }
    }
  }, [task, open, defaultGoalId, defaultDeadline, getDefaultTypeKey]);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type">{t('taskType')}</Label>
          <Select value={type} onValueChange={(v) => setType(v)}>
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
          <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
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
