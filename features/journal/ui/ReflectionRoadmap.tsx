'use client';

import { REFLECTION_MIN_ANSWERS } from '@/entities/journal/model/types';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { ReflectionQuestionVoice } from './ReflectionQuestionVoice';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ReflectionRoadmapProps {
  questions: string[];
  answers: string[];
  currentStep: number;
  onStepChange: (step: number) => void;
  onAnswerChange: (index: number, value: string) => void;
}

export function ReflectionRoadmap({
  questions,
  answers,
  currentStep,
  onStepChange,
  onAnswerChange,
}: ReflectionRoadmapProps) {
  const t = useTranslations('journal');

  const totalSteps = questions.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const currentQuestion = questions[currentStep] ?? '';
  const answeredCount = answers.filter((answer) => answer.trim()).length;

  const handleNext = () => {
    if (!isLastStep) {
      onStepChange(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      onStepChange(currentStep - 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{t('reflectionProgress', { current: currentStep + 1, total: totalSteps })}</span>
        <span>
          {t('reflectionAnsweredCount', { count: answeredCount, min: REFLECTION_MIN_ANSWERS })}
        </span>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max items-center px-1">
          {questions.map((_, index) => {
            const isCompleted = Boolean(answers[index]?.trim());
            const isCurrent = index === currentStep;
            const isPast = index < currentStep;
            const lineFilled = isCompleted || isPast;

            return (
              <div key={index} className="flex items-center">
                <button
                  type="button"
                  onClick={() => onStepChange(index)}
                  className={cn(
                    'relative z-[1] flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                    isCurrent && 'border-primary bg-primary ring-4 ring-primary/20',
                    !isCurrent && isCompleted && 'border-primary bg-primary',
                    !isCurrent && !isCompleted && isPast && 'border-primary/50 bg-primary/20',
                    !isCurrent &&
                      !isCompleted &&
                      !isPast &&
                      'border-muted-foreground/30 bg-background'
                  )}
                  aria-label={t('reflectionStep', { number: index + 1 })}
                />
                {index < totalSteps - 1 && (
                  <div
                    className={cn(
                      'mx-1 h-0.5 w-6 sm:w-8',
                      lineFilled ? 'bg-primary/60' : 'bg-border'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <Label htmlFor="reflection-current-answer" className="flex-1 leading-snug">
            {currentStep + 1}. {currentQuestion}
          </Label>
          <ReflectionQuestionVoice
            value={answers[currentStep] ?? ''}
            onChange={(nextValue) => onAnswerChange(currentStep, nextValue)}
          />
        </div>
        <Textarea
          id="reflection-current-answer"
          value={answers[currentStep] ?? ''}
          onChange={(e) => onAnswerChange(currentStep, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !isLastStep) {
              e.preventDefault();
              handleNext();
            }
          }}
          rows={4}
          placeholder={t('reflectionAnswerPlaceholder')}
          autoFocus
        />

        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={isFirstStep}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            {t('reflectionBack')}
          </Button>

          {!isLastStep ? (
            <Button type="button" size="sm" onClick={handleNext}>
              {answers[currentStep]?.trim() ? t('reflectionNext') : t('reflectionSkip')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{t('reflectionFinishHint')}</span>
          )}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{t('reflectionHint')}</p>
    </div>
  );
}
