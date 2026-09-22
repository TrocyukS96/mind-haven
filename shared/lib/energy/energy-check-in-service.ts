import type {
  EnergyAnswerInput,
  EnergyCheckIn,
  EnergyPeriodRange,
  EnergyPeriodStats,
} from '@/entities/energy/model/types';
import { buildEnergyCheckIn } from '@/entities/energy/lib/calculate-energy';
import { getEnergyPeriodStats, getLatestEnergyCheckIn } from '@/entities/energy/lib/energy-history';
import {
  assertEnergyQuestionCanBeDeleted,
} from '@/entities/energy/lib/question-guard';
import { buildActivityInput } from '@/entities/activity/lib/build-activity-input';
import { recordActivityEvent } from '@/shared/lib/activity/activity-service';
import { prisma } from '@/shared/lib/db';
import { getActiveEnergyTest, getEnergyTestById } from './energy-test-service';

export interface EnergyCheckInListResult {
  checkIns: EnergyCheckIn[];
  latest: EnergyCheckIn | null;
  stats: EnergyPeriodStats;
}

function mapCheckIn(row: {
  id: string;
  userId: string;
  testVersionId: string;
  score: number;
  createdAt: Date;
  answers: Array<{
    id: string;
    checkInId: string;
    questionId: string;
    questionVersion: number;
    rawValue: number;
    effectiveValue: number;
    weight: number;
    question: { key: string };
  }>;
}): EnergyCheckIn {
  return {
    id: row.id,
    userId: row.userId,
    testVersionId: row.testVersionId,
    score: row.score,
    createdAt: row.createdAt.toISOString(),
    answers: row.answers.map((answer) => ({
      id: answer.id,
      checkInId: answer.checkInId,
      questionId: answer.questionId,
      questionKey: answer.question.key,
      questionVersion: answer.questionVersion,
      rawValue: answer.rawValue,
      effectiveValue: answer.effectiveValue,
      weight: answer.weight,
    })),
  };
}

const checkInInclude = {
  answers: {
    include: {
      question: {
        select: { key: true },
      },
    },
  },
} as const;

export async function getEnergyCheckIns(
  userId: string,
  range?: EnergyPeriodRange
): Promise<EnergyCheckInListResult> {
  const rows = await prisma.energyCheckIn.findMany({
    where: { userId },
    include: checkInInclude,
    orderBy: { createdAt: 'desc' },
  });

  const checkIns = rows.map(mapCheckIn);

  return {
    checkIns,
    latest: getLatestEnergyCheckIn(checkIns),
    stats: getEnergyPeriodStats(checkIns, range),
  };
}

export async function createEnergyCheckIn(
  userId: string,
  answers: EnergyAnswerInput[]
): Promise<EnergyCheckIn> {
  const testVersion = await getActiveEnergyTest();
  const snapshot = buildEnergyCheckIn({
    userId,
    testVersion,
    answers,
  });

  const created = await prisma.$transaction(async (tx) => {
    const checkIn = await tx.energyCheckIn.create({
      data: {
        id: snapshot.id,
        userId,
        testVersionId: snapshot.testVersionId,
        score: snapshot.score,
        createdAt: new Date(snapshot.createdAt),
        answers: {
          create: snapshot.answers.map((answer) => ({
            id: answer.id,
            questionId: answer.questionId,
            questionVersion: answer.questionVersion,
            rawValue: answer.rawValue,
            effectiveValue: answer.effectiveValue,
            weight: answer.weight,
          })),
        },
      },
      include: checkInInclude,
    });

    await recordActivityEvent(
      userId,
      buildActivityInput({
        type: 'ENERGY_CHECK_IN_COMPLETED',
        entityId: checkIn.id,
        title: `${checkIn.score.toFixed(1)} / 10`,
        metadata: {
          score: checkIn.score,
          testVersionId: checkIn.testVersionId,
        },
        idempotencyKey: `energy:${checkIn.id}:completed`,
      }),
      tx
    );

    return checkIn;
  });

  return mapCheckIn(created);
}

export async function deleteEnergyQuestion(questionId: string): Promise<void> {
  const historicalAnswerCount = await prisma.energyCheckInAnswer.count({
    where: { questionId },
  });

  assertEnergyQuestionCanBeDeleted(historicalAnswerCount);

  const usedInVersion = await prisma.energyTestVersionQuestion.count({
    where: { questionId },
  });

  if (usedInVersion > 0) {
    await prisma.energyQuestion.update({
      where: { id: questionId },
      data: { isActive: false },
    });
    return;
  }

  await prisma.energyQuestion.delete({
    where: { id: questionId },
  });
}

export async function getEnergyCheckInById(
  userId: string,
  checkInId: string
): Promise<EnergyCheckIn | null> {
  const row = await prisma.energyCheckIn.findFirst({
    where: { id: checkInId, userId },
    include: checkInInclude,
  });

  return row ? mapCheckIn(row) : null;
}

export async function getEnergyTestForCheckIn(testVersionId: string) {
  return getEnergyTestById(testVersionId);
}
