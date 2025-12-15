'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Label } from '@/shared/ui/label';
import { Slider } from '@/shared/ui/slider';
import { useStore } from '@/shared/store/store-config';
import { Goal, GoalCategory } from '@/entities/goal/model/types';
import { Calendar } from 'lucide-react';

interface Props {
  goal?: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GoalForm({ goal, open, onOpenChange }: Props) {
  const { addGoal, updateGoal } = useStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<Exclude<GoalCategory, 'all'> >('month');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (goal && open) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setDeadline(goal.deadline);
      setCategory(goal.category);
      setProgress(goal.progress);
    } else if (!goal && open) {
      setTitle('');
      setDescription('');
      setDeadline('');
      setCategory('month');
      setProgress(0);
    }
  }, [goal, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const goalData = { title, description, deadline, category, progress };

    if (goal) {
      updateGoal(goal.id, goalData);
    } else {
      addGoal({ ...goalData, tasks: [] });
    }

    onOpenChange(false);
  };

  const isEditMode = !!goal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Редактировать цель' : 'Новая цель (SMART)'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="title">Название цели</Label>
            <Input
              id="title"
              placeholder="Например: Запустить MindHaven"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description">Описание (необязательно)</Label>
            <Textarea
              id="description"
              placeholder="Что именно ты хочешь достичь и зачем?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-2"
            />
          </div>

          {/* Прогресс — только в режиме редактирования */}
          {isEditMode && goal?.tasks.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Прогресс</Label>
                <span className="text-sm font-semibold text-primary">
                  {progress}%
                </span>
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
            <div>
              <Label htmlFor="deadline">Дедлайн</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                className="text-primary mt-2"
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category">Категория</Label>
              <select
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value as 'week' | 'month' | 'year')}
                className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="year">Год</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit">
              {isEditMode ? 'Сохранить изменения' : 'Создать цель'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}