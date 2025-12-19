'use client';

import { Goal, GoalCategory, GoalType } from '@/entities/goal/model/types';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Slider } from '@/shared/ui/slider';
import { Textarea } from '@/shared/ui/textarea';
import { useEffect, useState } from 'react';

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
  const [category, setCategory] = useState<Exclude<GoalCategory, 'all'>>('month');
  const [progress, setProgress] = useState(0);
  const [type, setType] = useState<GoalType>('short');

  useEffect(() => {
    if (goal && open) {
      setTitle(goal.title);
      setDescription(goal.description || '');
      setDeadline(goal.deadline);
      setCategory(goal.category);
      setProgress(goal.progress);
      setType(goal.type);
    } else if (!goal && open) {
      setTitle('');
      setDescription('');
      setDeadline('');
      setCategory('month');
      setProgress(0);
      setType('short');
    }
  }, [goal, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadline) return;

    const goalData = { title, description, deadline, category, progress };

    if (goal) {
      updateGoal(goal.id, goalData);
    } else {
      addGoal({ ...goalData, tasks: [], type });
    }

    onOpenChange(false);
  };

  const isEditMode = !!goal;

  return (

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

      <div className="space-y-2">
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
        <div className="space-y-2">
          <Label htmlFor="deadline">Дедлайн</Label>
          <Input
            id="deadline"
            type="date"
            value={deadline}
            className="text-primary"
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2 w-full">
          <Label htmlFor="category">Категория</Label>
          <Select
            value={category}
            
            onValueChange={(value) => setCategory(value as 'week' | 'month' | 'year')}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Неделя</SelectItem>
              <SelectItem value="month">Месяц</SelectItem>
              <SelectItem value="year">Год</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Тип цели</Label>
        <Select
          value={type}
          onValueChange={(value) => setType(value as GoalType)}
        >
          <SelectTrigger id="type">
            <SelectValue placeholder="Выберите тип цели" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="short">Краткосрочная</SelectItem>
            <SelectItem value="medium">Среднесрочная</SelectItem>
            <SelectItem value="long">Долгосрочная</SelectItem>
          </SelectContent>
        </Select>
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
  );
}