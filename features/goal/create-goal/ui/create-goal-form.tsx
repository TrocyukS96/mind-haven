'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { Select } from '@/shared/ui/select';
import { useStore } from '@/shared/providers/store-provider';

interface CreateGoalFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

export function CreateGoalForm({ onCancel, onSuccess }: CreateGoalFormProps) {
  const { addGoal } = useStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [category, setCategory] = useState<'week' | 'month' | 'year'>('month');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && deadline) {
      addGoal({ title, description, deadline, category });
      setTitle('');
      setDescription('');
      setDeadline('');
      setCategory('month');
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создание новой цели (SMART)</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Название цели</label>
            <Input
              placeholder="Например: Прочитать 12 книг"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Описание</label>
            <Textarea
              placeholder="Подробное описание цели и критерии успеха"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Дедлайн</label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Категория</label>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as 'week' | 'month' | 'year')}
              >
                <option value="week">Неделя</option>
                <option value="month">Месяц</option>
                <option value="year">Год</option>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Создать цель</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
