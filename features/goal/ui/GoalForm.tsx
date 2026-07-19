'use client';

import { Goal, GoalCategory, GoalType } from '@/entities/goal/model/types';
import { TaskPriority } from '@/entities/task/model/types';
import { useItemTypes } from '@/features/item-types';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
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
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

interface Props {
  goal?: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalForm({ goal, open, onOpenChange }: Props) {
  const { addGoal, updateGoal } = useStore();
  const { getEnabledTypes, getDefaultTypeKey } = useItemTypes();
  const goalTypes = getEnabledTypes('goals');
  const t = useTranslations('goals');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<Exclude<GoalCategory, 'all'>>('month');
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<GoalType>(() => getDefaultTypeKey('goals'));
  const [priority, setPriority] = useState<TaskPriority>('medium');

  useEffect(() => {
    if (goal && open) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setDeadline(goal.deadline);
      setCategory(goal.category);
      setProgress(goal.progress);
      setType(goal.type || getDefaultTypeKey('goals'));
      setPriority(goal.priority || 'medium');
    } else if (!goal && open) {
      setTitle('');
      setDescription('');
      setDeadline('');
      setCategory('month');
      setProgress(0);
      setType(getDefaultTypeKey('goals'));
      setPriority('medium');
    }
  }, [goal, open, getDefaultTypeKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const goalData = { title, description, deadline, category, progress, type, priority };

    if (goal) {
      updateGoal(goal.id, goalData);
    } else {
      addGoal({ ...goalData, tasks: [] });
    }

    onOpenChange(false);
  };

  const isEditMode = !!goal;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="title">{t('goalTitle')}</Label>
        <Input
          id="title"
          placeholder={t('goalTitlePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="mt-2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">{t('descriptionOptional')}</Label>
        <Textarea
          id="description"
          placeholder={t('descriptionPlaceholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-2"
        />
      </div>

      {isEditMode && goal?.tasks.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>{tCommon('progress')}</Label>
            <span className="text-sm font-semibold text-primary">{progress}%</span>
          </div>
          <Slider
            value={[progress]}
            onValueChange={(value) => setProgress(value[0])}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="deadline">{tCommon('deadline')}</Label>
          <DatePicker
            id="deadline"
            value={deadline}
            onChange={(date: string) => setDeadline(date)}
          />
        </div>

        <div className="space-y-2 w-full">
          <Label htmlFor="category">{t('category')}</Label>
          <Select
            value={category}
            onValueChange={(value) =>
              setCategory(value as 'week' | 'month' | 'year')
            }
          >
            <SelectTrigger id="category">
              <SelectValue placeholder={t('selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t('categories.week')}</SelectItem>
              <SelectItem value="month">{t('categories.month')}</SelectItem>
              <SelectItem value="year">{t('categories.year')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('goalType')}</Label>
          <Select value={type} onValueChange={(value) => setType(value)}>
            <SelectTrigger id="type">
              <SelectValue placeholder={t('selectGoalType')} />
            </SelectTrigger>
            <SelectContent>
              {goalTypes.map((goalType) => (
                <SelectItem key={goalType.key} value={goalType.key}>
                  {goalType.label || t(`types.${goalType.key}` as 'types.short')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">{t('priority')}</Label>
          <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
            <SelectTrigger id="priority">
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
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit">
          {isEditMode ? t('saveChanges') : t('createGoal')}
        </Button>
      </div>
    </form>
  );
}
