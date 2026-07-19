'use client';

import { useEffect, useMemo, useState } from 'react';
import { JournalEntry, ReflectionPeriod } from '@/entities/journal/model/types';
import {
  buildReflectionContent,
  buildReflectionTitle,
  createEmptyAnswers,
  hasMinimumAnswers,
  normalizeAnswers,
  resolveReflectionTagIds,
} from '@/entities/journal/lib/build-reflection-entry';
import { useReflectionQuestions } from '@/features/reflection-questions';
import { JournalTitleCombobox } from './JournalTitleCombobox';
import { ReflectionRoadmap } from './ReflectionRoadmap';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import { DatePicker } from '@/shared/ui/date-picker';
import { Label } from '@/shared/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useTranslations } from 'next-intl';

interface Props {
  entry?: JournalEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function toDateString(value?: string): string {
  if (!value) return new Date().toISOString().split('T')[0];
  return value.split('T')[0];
}

export function ReflectionForm({ entry, open, onOpenChange }: Props) {
  const { addJournalEntry, updateJournalEntry, addJournalTag } = useStore();
  const { getQuestions } = useReflectionQuestions();
  const [period, setPeriod] = useState<ReflectionPeriod>('day');
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [date, setDate] = useState('');
  const t = useTranslations('journal');
  const tCommon = useTranslations('common');

  const isEditMode = Boolean(entry);

  const questions = useMemo(() => getQuestions(period), [getQuestions, period]);

  const getDefaultTitle = (nextPeriod: ReflectionPeriod) =>
    buildReflectionTitle(nextPeriod, (key) => t(key as 'reflectionTitles.day'));

  useEffect(() => {
    if (!open) return;

    if (entry?.entryType === 'reflection') {
      const nextPeriod = entry.reflectionPeriod ?? 'day';
      const nextQuestions = getQuestions(nextPeriod);
      setPeriod(nextPeriod);
      setTitle(entry.title);
      setTitleTouched(true);
      setAnswers(normalizeAnswers(entry.reflectionAnswers, nextQuestions.length));
      setCurrentStep(0);
      setDate(entry.date);
    } else {
      setPeriod('day');
      setTitle(getDefaultTitle('day'));
      setTitleTouched(false);
      setAnswers(createEmptyAnswers(getQuestions('day').length));
      setCurrentStep(0);
      setDate('');
    }
  }, [entry, open, getQuestions, t]);

  useEffect(() => {
    setAnswers((prev) => {
      if (prev.length === questions.length) return prev;
      return normalizeAnswers(prev, questions.length);
    });
    setCurrentStep((prev) => Math.min(prev, Math.max(questions.length - 1, 0)));
  }, [questions.length]);

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers((prev) => prev.map((answer, i) => (i === index ? value : answer)));
  };

  const handleTitleChange = (value: string) => {
    setTitleTouched(true);
    setTitle(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasMinimumAnswers(answers) || !title.trim()) return;

    const content = buildReflectionContent(
      questions,
      answers,
      t(`reflectionContentHeader.${period}` as 'reflectionContentHeader.day')
    );
    const tagIds = resolveReflectionTagIds(
      addJournalTag,
      t('reflectionTag'),
      isEditMode ? entry?.tagIds : undefined
    );
    const finalDate = toDateString(date);

    if (isEditMode && entry) {
      updateJournalEntry(entry.id, {
        title: title.trim(),
        content,
        date: finalDate,
        entryType: 'reflection',
        reflectionPeriod: period,
        reflectionAnswers: answers,
        tagIds,
      });
    } else {
      addJournalEntry({
        title: title.trim(),
        content,
        date: finalDate,
        tagIds,
        entryType: 'reflection',
        reflectionPeriod: period,
        reflectionAnswers: answers,
      });
    }

    onOpenChange(false);
  };

  const canSubmit = hasMinimumAnswers(answers) && Boolean(title.trim());

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="reflection-title">{t('entryTitle')}</Label>
        <JournalTitleCombobox
          id="reflection-title"
          value={title}
          onChange={handleTitleChange}
          placeholder={t('entryTitlePlaceholder')}
        />
      </div>

      <div>
        <Label>{t('reflectionPeriod')}</Label>
        <Select
          value={period}
          onValueChange={(value) => {
            const nextPeriod = value as ReflectionPeriod;
            setPeriod(nextPeriod);
            setAnswers(createEmptyAnswers(getQuestions(nextPeriod).length));
            setCurrentStep(0);
            if (!isEditMode && !titleTouched) {
              setTitle(getDefaultTitle(nextPeriod));
            }
          }}
        >
          <SelectTrigger className="mt-2">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">{t('reflectionPeriods.day')}</SelectItem>
            <SelectItem value="week">{t('reflectionPeriods.week')}</SelectItem>
            <SelectItem value="month">{t('reflectionPeriods.month')}</SelectItem>
            <SelectItem value="year">{t('reflectionPeriods.year')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {questions.length > 0 ? (
        <ReflectionRoadmap
          questions={questions}
          answers={answers}
          currentStep={currentStep}
          onStepChange={setCurrentStep}
          onAnswerChange={handleAnswerChange}
        />
      ) : (
        <p className="text-sm text-muted-foreground">{t('reflectionNoQuestions')}</p>
      )}

      <DatePicker
        id="reflection-date"
        label={t('entryDate')}
        value={date}
        onChange={setDate}
      />

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {tCommon('cancel')}
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {isEditMode ? tCommon('save') : t('createEntry')}
        </Button>
      </div>
    </form>
  );
}
