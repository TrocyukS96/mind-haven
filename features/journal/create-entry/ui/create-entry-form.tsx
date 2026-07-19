'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface CreateEntryFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

export function CreateEntryForm({ onCancel, onSuccess }: CreateEntryFormProps) {
  const { addJournalEntry } = useStore();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');

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
        <CardTitle>{t('newEntry')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder={t('entryTitle')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Textarea
            placeholder={t('entryContentPlaceholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            required
          />
          <div className="flex gap-2">
            <Button type="submit">{tCommon('save')}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
