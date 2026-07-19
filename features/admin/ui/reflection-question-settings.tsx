'use client';

import type { ReflectionPeriod } from '@/entities/journal/model/types';
import type { ReflectionQuestionCatalog } from '@/shared/config/reflection-questions';
import { REFLECTION_PERIODS } from '@/entities/journal/model/types';
import { Button } from '@/shared/ui/button';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { cn } from '@/shared/lib/utils';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

interface ReflectionQuestionSettingsPanelProps {
  initialCatalog: ReflectionQuestionCatalog;
}

export function ReflectionQuestionSettingsPanel({
  initialCatalog,
}: ReflectionQuestionSettingsPanelProps) {
  const t = useTranslations('admin.reflectionQuestions');
  const tJournal = useTranslations('journal.reflectionPeriods');
  const [catalog, setCatalog] = useState(initialCatalog);
  const [activePeriod, setActivePeriod] = useState<ReflectionPeriod>('day');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = async (sortOrder: number) => {
    const question = catalog[activePeriod].find((item) => item.sortOrder === sortOrder);
    if (!question) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/reflection-questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: activePeriod,
          sortOrder,
          textRu: question.textRu,
          textEn: question.textEn,
          enabled: question.enabled,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update question');
      }

      const data = (await response.json()) as { questions: ReflectionQuestionCatalog };
      setCatalog(data.questions);
      setMessage(t('saved'));
    } catch {
      setMessage(t('saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const updateQuestion = (
    sortOrder: number,
    updates: Partial<{ textRu: string; textEn: string; enabled: boolean }>
  ) => {
    setCatalog((prev) => ({
      ...prev,
      [activePeriod]: prev[activePeriod].map((question) =>
        question.sortOrder === sortOrder ? { ...question, ...updates } : question
      ),
    }));
  };

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t('title')}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t('description')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {REFLECTION_PERIODS.map((period) => (
          <Button
            key={period}
            type="button"
            variant={activePeriod === period ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActivePeriod(period)}
          >
            {tJournal(period)}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {catalog[activePeriod]
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((question) => (
            <div
              key={`${activePeriod}-${question.sortOrder}`}
              className="rounded-lg border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium">
                  {t('questionNumber', { number: question.sortOrder + 1 })}
                </span>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`reflection-enabled-${activePeriod}-${question.sortOrder}`}
                    checked={question.enabled}
                    onCheckedChange={(checked) =>
                      updateQuestion(question.sortOrder, {
                        enabled: checked === true,
                      })
                    }
                  />
                  <Label
                    htmlFor={`reflection-enabled-${activePeriod}-${question.sortOrder}`}
                    className="cursor-pointer text-sm"
                  >
                    {t('enabled')}
                  </Label>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('textRu')}</Label>
                  <Input
                    value={question.textRu}
                    onChange={(e) =>
                      updateQuestion(question.sortOrder, { textRu: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('textEn')}</Label>
                  <Input
                    value={question.textEn}
                    onChange={(e) =>
                      updateQuestion(question.sortOrder, { textEn: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => handleSave(question.sortOrder)}
                >
                  {t('saveQuestion')}
                </Button>
              </div>
            </div>
          ))}
      </div>

      {message && (
        <p className={cn('text-sm', message === t('saveError') ? 'text-destructive' : 'text-muted-foreground')}>
          {message}
        </p>
      )}
    </section>
  );
}
