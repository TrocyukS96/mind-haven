'use client';

import { Goal, GoalType } from '@/entities/goal/model/types';
import { getGoalCategoryFromDeadline } from '@/entities/goal/lib/get-goal-category-from-deadline';
import { TaskPriority } from '@/entities/task/model/types';
import { buildGoalFormValues } from '@/features/goal/lib/goal-form-initial-values';
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
import { X } from 'lucide-react';
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
  const { addGoal, updateGoal, addTask, goalFormDraft } = useStore();
  const { getEnabledTypes, getDefaultTypeKey } = useItemTypes();
  const goalTypes = getEnabledTypes('goals');
  const defaultType = getDefaultTypeKey('goals');
  const t = useTranslations('goals');
  const tCommon = useTranslations('common');
  const tPriorities = useTranslations('priorities');

  const initialValues = buildGoalFormValues({
    goal,
    draft: goalFormDraft,
    defaultType,
  });

  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [deadline, setDeadline] = useState(initialValues.deadline);
  const [progress, setProgress] = useState(initialValues.progress);
  const [type, setType] = useState<GoalType>(initialValues.type);
  const [priority, setPriority] = useState<TaskPriority>(initialValues.priority);
  const [steps, setSteps] = useState<string[]>(initialValues.steps);

  const isEditMode = !!goal;

  useEffect(() => {
    if (!open) {
      return;
    }

    const nextValues = buildGoalFormValues({
      goal,
      draft: goalFormDraft,
      defaultType,
    });

    setTitle(nextValues.title);
    setDescription(nextValues.description);
    setDeadline(nextValues.deadline);
    setProgress(nextValues.progress);
    setType(nextValues.type);
    setPriority(nextValues.priority);
    setSteps(nextValues.steps);
  }, [goal, open, goalFormDraft, defaultType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const goalData = { title, description, deadline, progress, type, priority };

    if (goal) {
      updateGoal(goal.id, goalData);
    } else {
      const goalId = addGoal({ ...goalData, tasks: [] });

      steps
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((stepTitle) => {
          addTask(stepTitle, goalId, priority, deadline, type);
        });
    }

    onOpenChange(false);
  };

  const updateStep = (index: number, value: string) => {
    setSteps((current) => current.map((item, i) => (i === index ? value : item)));
  };

  const removeStep = (index: number) => {
    setSteps((current) => current.filter((_, i) => i !== index));
  };

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

      {steps.length > 0 && !isEditMode && (
        <div className="space-y-2">
          <Label>{t('stepsToGoal')}</Label>
          <div className="space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={step}
                  onChange={(e) => updateStep(index, e.target.value)}
                  placeholder={t('stepPlaceholder')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeStep(index)}
                  aria-label={tCommon('delete')}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <Select key={`type-${type}`} value={type} onValueChange={setType}>
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
            <Select
              key={`priority-${priority}`}
              value={priority}
              onValueChange={(value) => setPriority(value as TaskPriority)}
            >
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
