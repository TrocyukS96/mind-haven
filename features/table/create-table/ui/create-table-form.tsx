'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { useStore } from '@/shared/store/store-config';
import { useTranslations } from 'next-intl';

interface CreateTableFormProps {
  onCancel: () => void;
  onSuccess?: () => void;
}

export function CreateTableForm({ onCancel, onSuccess }: CreateTableFormProps) {
  const { addTable } = useStore();
  const [name, setName] = useState('');
  const [type, setType] = useState<'finance' | 'projects' | 'custom'>('custom');
  const t = useTranslations('tables');
  const tCommon = useTranslations('common');

  const getTemplateColumns = (templateType: 'finance' | 'projects' | 'custom') => {
    switch (templateType) {
      case 'finance':
        return [
          t('columns.date'),
          t('columns.category'),
          t('columns.amount'),
          t('columns.note'),
        ];
      case 'projects':
        return [
          t('columns.project'),
          t('columns.status'),
          t('columns.date'),
          t('columns.priority'),
        ];
      default:
        return [t('columns.column1'), t('columns.column2'), t('columns.column3')];
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name) {
      addTable({ name, type, columns: getTemplateColumns(type) });
      setName('');
      setType('custom');
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('newTable')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">{t('tableName')}</label>
            <Input
              placeholder={t('tableNamePlaceholder')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">{t('template')}</label>
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
                <p className="font-medium mb-1">{t('templates.finance')}</p>
                <p className="text-sm text-muted-foreground">{t('templates.financeDesc')}</p>
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
                <p className="font-medium mb-1">{t('templates.projects')}</p>
                <p className="text-sm text-muted-foreground">{t('templates.projectsDesc')}</p>
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
                <p className="font-medium mb-1">{t('templates.custom')}</p>
                <p className="text-sm text-muted-foreground">{t('templates.customDesc')}</p>
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit">{tCommon('create')}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {tCommon('cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
