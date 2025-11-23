'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useStore } from '@/shared/store/store-config';

interface CreateTableFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

const templates = {
  finance: ['Дата', 'Категория', 'Сумма', 'Примечание'],
  projects: ['Проект', 'Статус', 'Дедлайн', 'Приоритет'],
  custom: ['Колонка 1', 'Колонка 2', 'Колонка 3'],
};

export function CreateTableForm({ onCancel, onSuccess }: CreateTableFormProps) {
  const { addTable } = useStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'finance' | 'projects' | 'custom'>('custom');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      addTable({ name, type, columns: templates[type] });
      setName('');
      setType('custom');
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новая таблица</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Название таблицы</label>
            <Input
              placeholder="Например: Финансовый трекер"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Шаблон</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setType('finance')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  type === 'finance'
                    ? 'border-primary bg-blue-50'
                    : 'border-border hover:border-primary'
                }`}
              >
                <p className="font-medium mb-1">Финансы</p>
                <p className="text-sm text-muted-foreground">
                  Доходы и расходы
                </p>
              </button>
              <button
                type="button"
                onClick={() => setType('projects')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  type === 'projects'
                    ? 'border-primary bg-blue-50'
                    : 'border-border hover:border-primary'
                }`}
              >
                <p className="font-medium mb-1">Проекты</p>
                <p className="text-sm text-muted-foreground">
                  Управление задачами
                </p>
              </button>
              <button
                type="button"
                onClick={() => setType('custom')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  type === 'custom'
                    ? 'border-primary bg-blue-50'
                    : 'border-border hover:border-primary'
                }`}
              >
                <p className="font-medium mb-1">Кастомная</p>
                <p className="text-sm text-muted-foreground">
                  Свой формат
                </p>
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">Создать</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
