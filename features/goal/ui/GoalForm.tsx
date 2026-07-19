'use client';

import { Goal, GoalType } from '@/entities/goal/model/types';
import { getGoalCategoryFromDeadline } from '@/entities/goal/lib/get-goal-category-from-deadline';
import { TaskPriority } from '@/entities/task/model/types';
import { useItemTypes } from '@/features/item-types';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import { DialogFooter } from '@/shared/ui/dialog';
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
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  goal?: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function FormField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium leading-none">
        {label}
      </Label>
      {children}
    </div>
  );
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
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<GoalType>(() => getDefaultTypeKey('goals'));
  const [priority, setPriority] = useState<TaskPriority>('medium');

  useEffect(() => {
    if (goal && open) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setDeadline(goal.deadline);
      setProgress(goal.progress);
      setType(goal.type || getDefaultTypeKey('goals'));
      setPriority(goal.priority || 'medium');
    } else if (!goal && open) {
      setTitle('');
      setDescription('');
      setDeadline('');
      setProgress(0);
      setType(getDefaultTypeKey('goals'));
      setPriority('medium');
    }
  }, [goal, open, getDefaultTypeKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const goalData = { title, description, deadline, progress, type, priority };

    if (goal) {
      updateGoal(goal.id, goalData);
    } else {
      addGoal({ ...goalData, tasks: [] });
    }

    onOpenChange(false);
  };

  const isEditMode = !!goal;
  const autoCategory = deadline ? getGoalCategoryFromDeadline(deadline) : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-4">
        <FormField label={t('goalTitle')} htmlFor="title">
          <Input
            id="title"
            placeholder={t('goalTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="h-10"
          />
        </FormField>

        <FormField label={t('descriptionOptional')} htmlFor="description">
          <Textarea
            id="description"
            placeholder={t('descriptionPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="min-h-24 resize-none"
          />
        </FormField>
      </div>

      {isEditMode && goal?.tasks.length === 0 && (
        <div className="rounded-lg border border-border/60 bg-muted/25 px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <Label className="text-sm font-medium leading-none">{tCommon('progress')}</Label>
            <span className="text-sm font-semibold tabular-nums text-primary">{progress}%</span>
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

      <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
        <FormField label={tCommon('deadline')} htmlFor="deadline">
          <DatePicker id="deadline" value={deadline} onChange={setDeadline} />
          {autoCategory && (
            <p className="text-xs text-muted-foreground">
              {t('category')}: {t(`categories.${autoCategory}` as 'categories.week')}
            </p>
          )}
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('goalType')}>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="type" className="h-10 w-full">
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
          </FormField>

          <FormField label={t('priority')} htmlFor="priority">
            <Select value={priority} onValueChange={(value) => setPriority(value as TaskPriority)}>
              <SelectTrigger id="priority" className="h-10 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{tPriorities('low')}</SelectItem>
                <SelectItem value="medium">{tPriorities('medium')}</SelectItem>
                <SelectItem value="high">{tPriorities('high')}</SelectItem>
                <SelectItem value="urgent">{tPriorities('urgentExclaim')}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      <DialogFooter className="gap-2 px-0 pt-0 sm:gap-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit">{isEditMode ? t('saveChanges') : t('createGoal')}</Button>
      </DialogFooter>
    </form>
  );
}
