'use client';

import type { ReflectionPeriod } from '@/entities/journal/model/types';
import type {
  ReflectionQuestionCatalog,
  ReflectionQuestionDefinition,
} from '@/shared/config/reflection-questions';
import {
  getEnabledReflectionQuestions,
  getReflectionQuestionText,
} from '@/shared/config/reflection-questions';
import { createContext, useContext, useMemo } from 'react';
import { useLocale } from 'next-intl';

interface ReflectionQuestionProviderProps {
  catalog: ReflectionQuestionCatalog;
  children: React.ReactNode;
}

interface ReflectionQuestionContextValue {
  catalog: ReflectionQuestionCatalog;
  getDefinitions: (period: ReflectionPeriod) => ReflectionQuestionDefinition[];
  getQuestions: (period: ReflectionPeriod) => string[];
}

const ReflectionQuestionContext = createContext<ReflectionQuestionContextValue | null>(
  null
);

export function ReflectionQuestionProvider({
  catalog,
  children,
}: ReflectionQuestionProviderProps) {
  const locale = useLocale();

  const value = useMemo<ReflectionQuestionContextValue>(
    () => ({
      catalog,
      getDefinitions: (period) => getEnabledReflectionQuestions(catalog, period),
      getQuestions: (period) =>
        getEnabledReflectionQuestions(catalog, period).map((question) =>
          getReflectionQuestionText(question, locale)
        ),
    }),
    [catalog, locale]
  );

  return (
    <ReflectionQuestionContext.Provider value={value}>
      {children}
    </ReflectionQuestionContext.Provider>
  );
}

export function useReflectionQuestions(): ReflectionQuestionContextValue {
  const context = useContext(ReflectionQuestionContext);

  if (!context) {
    throw new Error(
      'useReflectionQuestions must be used within ReflectionQuestionProvider'
    );
  }

  return context;
}
