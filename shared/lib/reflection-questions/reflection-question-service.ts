import {
  getDefaultReflectionQuestions,
  getEnabledReflectionQuestions,
  type ReflectionQuestionCatalog,
  type ReflectionQuestionDefinition,
} from '@/shared/config/reflection-questions';
import type { ReflectionPeriod } from '@/entities/journal/model/types';
import { REFLECTION_PERIODS } from '@/entities/journal/model/types';
import { prisma } from '@/shared/lib/db';

function isReflectionPeriod(value: string): value is ReflectionPeriod {
  return REFLECTION_PERIODS.includes(value as ReflectionPeriod);
}

function normalizeCatalog(
  rows: ReflectionQuestionDefinition[]
): ReflectionQuestionCatalog {
  const defaults = getDefaultReflectionQuestions();
  const result = structuredClone(defaults);

  for (const row of rows) {
    const periodQuestions = result[row.period];
    const existingIndex = periodQuestions.findIndex(
      (question) => question.sortOrder === row.sortOrder
    );

    if (existingIndex >= 0) {
      periodQuestions[existingIndex] = row;
    } else {
      periodQuestions.push(row);
    }
  }

  for (const period of REFLECTION_PERIODS) {
    result[period].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return result;
}

export async function ensureReflectionQuestionsSeeded(): Promise<void> {
  const existing = await prisma.reflectionQuestion.findMany({
    select: { period: true, sortOrder: true },
  });

  const existingKeys = new Set(
    existing.map((item) => `${item.period}:${item.sortOrder}`)
  );
  const defaults = getDefaultReflectionQuestions();
  const missing: Array<{
    period: ReflectionPeriod;
    sortOrder: number;
    textRu: string;
    textEn: string;
    enabled: boolean;
  }> = [];

  for (const period of REFLECTION_PERIODS) {
    for (const question of defaults[period]) {
      const compositeKey = `${period}:${question.sortOrder}`;
      if (!existingKeys.has(compositeKey)) {
        missing.push({
          period: question.period,
          sortOrder: question.sortOrder,
          textRu: question.textRu,
          textEn: question.textEn,
          enabled: question.enabled,
        });
      }
    }
  }

  if (missing.length > 0) {
    await prisma.reflectionQuestion.createMany({
      data: missing,
      skipDuplicates: true,
    });
  }
}

export async function getReflectionQuestions(): Promise<ReflectionQuestionCatalog> {
  const defaults = getDefaultReflectionQuestions();

  try {
    await ensureReflectionQuestionsSeeded();

    const rows = await prisma.reflectionQuestion.findMany({
      orderBy: [{ period: 'asc' }, { sortOrder: 'asc' }],
    });

    const mapped: ReflectionQuestionDefinition[] = rows
      .filter((row) => isReflectionPeriod(row.period))
      .map((row) => ({
        period: row.period as ReflectionPeriod,
        sortOrder: row.sortOrder,
        textRu: row.textRu,
        textEn: row.textEn,
        enabled: row.enabled,
      }));

    return mapped.length > 0 ? normalizeCatalog(mapped) : defaults;
  } catch {
    return defaults;
  }
}

export async function updateReflectionQuestion(
  period: ReflectionPeriod,
  sortOrder: number,
  updates: Partial<Pick<ReflectionQuestionDefinition, 'textRu' | 'textEn' | 'enabled'>>,
  updatedBy?: string
): Promise<ReflectionQuestionCatalog> {
  const catalog = await getReflectionQuestions();
  const current = catalog[period].find((question) => question.sortOrder === sortOrder);

  if (!current) {
    throw new Error('Question not found');
  }

  await prisma.reflectionQuestion.upsert({
    where: {
      period_sortOrder: {
        period,
        sortOrder,
      },
    },
    create: {
      period,
      sortOrder,
      textRu: updates.textRu ?? current.textRu,
      textEn: updates.textEn ?? current.textEn,
      enabled: updates.enabled ?? current.enabled,
      updatedBy,
    },
    update: {
      textRu: updates.textRu ?? current.textRu,
      textEn: updates.textEn ?? current.textEn,
      enabled: updates.enabled ?? current.enabled,
      updatedBy,
    },
  });

  return getReflectionQuestions();
}

export { getEnabledReflectionQuestions };
