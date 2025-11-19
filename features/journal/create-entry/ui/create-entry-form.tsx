'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { useStore } from '@/shared/providers/store-provider';

interface CreateEntryFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

export function CreateEntryForm({ onCancel, onSuccess }: CreateEntryFormProps) {
  const { addJournalEntry } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && content) {
      addJournalEntry({ title, content });
      setTitle('');
      setContent('');
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Новая запись</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Заголовок записи"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder="Начни писать свои мысли... (поддерживается Markdown)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            required
          />
          <div className="flex gap-2">
            <Button type="submit">Сохранить</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
