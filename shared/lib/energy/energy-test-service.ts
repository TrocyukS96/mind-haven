import type { EnergyTestQuestion, EnergyTestSnapshot } from '@/entities/energy/model/types';
import { getDefaultEnergyTestSnapshot } from '@/shared/config/energy-test';
import { prisma } from '@/shared/lib/db';

function mapSnapshot(params: {
  id: string;
  version: number;
  name: string;
  isActive: boolean;
  questions: Array<{
    sortOrder: number;
    weight: number;
    question: {
      id: string;
      key: string;
      version: number;
      textRu: string;
      textEn: string;
      minValue: number;
      maxValue: number;
      minLabelRu: string;
      minLabelEn: string;
      midLabelRu: string;
      midLabelEn: string;
      maxLabelRu: string;
      maxLabelEn: string;
      reverseScoring: boolean;
      defaultWeight: number;
      isActive: boolean;
    };
  }>;
}): EnergyTestSnapshot {
  const questions: EnergyTestQuestion[] = params.questions
    .slice()
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ question, sortOrder, weight }) => ({
      id: question.id,
      key: question.key,
      version: question.version,
      textRu: question.textRu,
      textEn: question.textEn,
      minValue: question.minValue,
      maxValue: question.maxValue,
      minLabelRu: question.minLabelRu,
      minLabelEn: question.minLabelEn,
      midLabelRu: question.midLabelRu,
      midLabelEn: question.midLabelEn,
      maxLabelRu: question.maxLabelRu,
      maxLabelEn: question.maxLabelEn,
      reverseScoring: question.reverseScoring,
      defaultWeight: question.defaultWeight,
      isActive: question.isActive,
      sortOrder,
      weight,
    }));

  return {
    id: params.id,
    version: params.version,
    name: params.name,
    isActive: params.isActive,
    questions,
  };
}

export async function ensureEnergyTestSeeded(): Promise<void> {
  const defaults = getDefaultEnergyTestSnapshot();
  const existing = await prisma.energyTestVersion.findUnique({
    where: { id: defaults.id },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.energyTestVersion.create({
      data: {
        id: defaults.id,
        version: defaults.version,
        name: defaults.name,
        isActive: defaults.isActive,
      },
    });

    for (const question of defaults.questions) {
      await tx.energyQuestion.create({
        data: {
          id: question.id,
          key: question.key,
          version: question.version,
          textRu: question.textRu,
          textEn: question.textEn,
          minValue: question.minValue,
          maxValue: question.maxValue,
          minLabelRu: question.minLabelRu,
          minLabelEn: question.minLabelEn,
          midLabelRu: question.midLabelRu,
          midLabelEn: question.midLabelEn,
          maxLabelRu: question.maxLabelRu,
          maxLabelEn: question.maxLabelEn,
          reverseScoring: question.reverseScoring,
          defaultWeight: question.defaultWeight,
          isActive: question.isActive,
        },
      });

      await tx.energyTestVersionQuestion.create({
        data: {
          testVersionId: defaults.id,
          questionId: question.id,
          sortOrder: question.sortOrder,
          weight: question.weight,
        },
      });
    }
  });
}

export async function getEnergyTestById(id: string): Promise<EnergyTestSnapshot | null> {
  const row = await prisma.energyTestVersion.findUnique({
    where: { id },
    include: {
      questions: {
        include: { question: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!row) {
    return null;
  }

  return mapSnapshot(row);
}

export async function getActiveEnergyTest(): Promise<EnergyTestSnapshot> {
  const defaults = getDefaultEnergyTestSnapshot();

  try {
    await ensureEnergyTestSeeded();

    const active = await prisma.energyTestVersion.findFirst({
      where: { isActive: true },
      include: {
        questions: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { version: 'desc' },
    });

    if (active && active.questions.length > 0) {
      return mapSnapshot({
        ...active,
        questions: active.questions.filter((item) => item.question.isActive),
      });
    }

    const latest = await prisma.energyTestVersion.findFirst({
      include: {
        questions: {
          include: { question: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { version: 'desc' },
    });

    return latest ? mapSnapshot(latest) : defaults;
  } catch {
    return defaults;
  }
}
