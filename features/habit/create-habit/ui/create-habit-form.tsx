'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select } from '@/shared/ui/select';
import { useStore } from '@/shared/store/store-config';

interface CreateHabitFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

export function CreateHabitForm({ onCancel, onSuccess }: CreateHabitFormProps) {
  const { addHabit } = useStore();
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('Ежедневно');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      addHabit({ name, frequency });
      setName('');
      setFrequency('Ежедневно');
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новая привычка</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Название привычки</label>
            <Input
              placeholder="Например: Медитация, Чтение, Спорт"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Частота</label>
            <Select value={frequency} onValueChange={(value) => setFrequency(value)}>
              <option value="Ежедневно">Ежедневно</option>
              <option value="3 раза в неделю">3 раза в неделю</option>
              <option value="5 раз в неделю">5 раз в неделю</option>
              <option value="По выходным">По выходным</option>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Создать привычку</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
