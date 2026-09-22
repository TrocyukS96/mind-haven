'use client';

import { useEffect, useMemo, useState } from 'react';
import type { EnergyCheckIn, EnergyTestQuestion } from '@/entities/energy/model/types';
import {
  getEnergyLevel,
  getEnergyQuestionCopy,
  getLatestEnergyCheckIn,
} from '@/entities/energy';
import { useStore } from '@/shared/store/store-config';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Slider } from '@/shared/ui/slider';
import { useLocale, useTranslations } from 'next-intl';

interface EnergyCheckInModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnergyCheckInModal({ open, onOpenChange }: EnergyCheckInModalProps) {
  const t = useTranslations('energy');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const energyTest = useStore((state) => state.energyTest);
  const checkIns = useStore((state) => state.energyCheckIns);
  const submitEnergyCheckIn = useStore((state) => state.submitEnergyCheckIn);
  const questions = energyTest.questions;
  const latest = getLatestEnergyCheckIn(checkIns);

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState<EnergyCheckIn | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[stepIndex] ?? null;
  const isLastQuestion = stepIndex === questions.length - 1;

  useEffect(() => {
    if (!open) {
      return;
    }

    setStepIndex(0);
    setAnswers({});
    setCompleted(null);
    setSubmitting(false);
    setError(null);
  }, [open, energyTest.id]);

  const progressLabel = useMemo(() => {
    if (!questions.length) {
      return '';
    }

    return t('progress', { current: stepIndex + 1, total: questions.length });
  }, [questions.length, stepIndex, t]);

  const handleValueChange = (question: EnergyTestQuestion, value: number) => {
    setAnswers((current) => ({ ...current, [question.id]: value }));
  };

  const currentValue =
    currentQuestion && answers[currentQuestion.id] !== undefined
      ? answers[currentQuestion.id]
      : 5;

  const handleNext = async () => {
    if (!currentQuestion) {
      return;
    }

    const nextAnswers = { ...answers, [currentQuestion.id]: currentValue };
    setAnswers(nextAnswers);

    if (!isLastQuestion) {
      setStepIndex((index) => index + 1);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const checkIn = await submitEnergyCheckIn(
        questions.map((question) => ({
          questionId: question.id,
          rawValue: nextAnswers[question.id] ?? 5,
        }))
      );
      setCompleted(checkIn);
    } catch {
      setError(t('saveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setStepIndex(0);
    setAnswers({});
    setCompleted(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1 border-b px-6 py-5 text-left">
          <DialogTitle className="text-xl">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="max-h-[calc(100vh-10rem)] space-y-5 overflow-y-auto px-6 py-5">
          {completed ? (
            <div className="space-y-4">
              <div className="rounded-xl border bg-primary/5 px-4 py-5 text-center">
                <p className="text-sm text-muted-foreground">{t('resultLabel')}</p>
                <p className="mt-1 text-4xl font-semibold tabular-nums">
                  {completed.score.toFixed(1)}
                  <span className="text-lg font-medium text-muted-foreground"> / 10</span>
                </p>
                <p className="mt-2 text-sm font-medium">
                  {t(`levels.${getEnergyLevel(completed.score)}`)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{t('resultHint')}</p>
            </div>
          ) : currentQuestion ? (
            <div className="space-y-5">
              {latest && (
                <p className="text-xs text-muted-foreground">
                  {t('lastScore', {
                    score: latest.score.toFixed(1),
                    level: t(`levels.${getEnergyLevel(latest.score)}`),
                  })}
                </p>
              )}
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {progressLabel}
              </p>
              <p className="text-base font-medium leading-relaxed">
                {getEnergyQuestionCopy(currentQuestion, locale).text}
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-semibold tabular-nums">{currentValue}</span>
                  <span className="text-sm text-muted-foreground">0–10</span>
                </div>
                <Slider
                  min={currentQuestion.minValue}
                  max={currentQuestion.maxValue}
                  step={1}
                  value={[currentValue]}
                  onValueChange={([value]) => handleValueChange(currentQuestion, value)}
                />
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <p>{getEnergyQuestionCopy(currentQuestion, locale).minLabel}</p>
                  <p className="text-center">
                    {getEnergyQuestionCopy(currentQuestion, locale).midLabel}
                  </p>
                  <p className="text-right">
                    {getEnergyQuestionCopy(currentQuestion, locale).maxLabel}
                  </p>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('emptyTest')}</p>
          )}
        </div>

        <DialogFooter className="border-t px-6 py-4">
          {completed ? (
            <>
              <Button variant="outline" onClick={handleRetake}>
                {t('retake')}
              </Button>
              <Button onClick={() => onOpenChange(false)}>{t('done')}</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tCommon('cancel')}
              </Button>
              {stepIndex > 0 && (
                <Button variant="outline" onClick={() => setStepIndex((index) => index - 1)}>
                  {t('back')}
                </Button>
              )}
              <Button onClick={handleNext} disabled={!currentQuestion || submitting}>
                {submitting ? t('saving') : isLastQuestion ? t('finish') : t('next')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
