import type {
  EnergyAnswerInput,
  EnergyCheckIn,
  EnergyCheckInAnswer,
  EnergyLevel,
  EnergyTestQuestion,
  EnergyTestSnapshot,
} from '../model/types';

export class EnergyCalculationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnergyCalculationError';
  }
}

export function clampEnergyValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function roundEnergyScore(value: number): number {
  return Math.round(value * 10) / 10;
}

export function calculateEffectiveScore(
  rawValue: number,
  question: Pick<EnergyTestQuestion, 'minValue' | 'maxValue' | 'reverseScoring'>
): number {
  const raw = clampEnergyValue(rawValue, question.minValue, question.maxValue);

  if (question.reverseScoring) {
    return clampEnergyValue(question.maxValue - raw, question.minValue, question.maxValue);
  }

  return raw;
}

export function calculateEnergyScore(
  answers: EnergyAnswerInput[],
  questions: Array<Pick<EnergyTestQuestion, 'id' | 'minValue' | 'maxValue' | 'reverseScoring' | 'weight'>>
): number {
  if (questions.length === 0) {
    throw new EnergyCalculationError('Energy test has no questions');
  }

  const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
  let weightedSum = 0;
  let totalWeight = 0;

  for (const question of questions) {
    const answer = answersByQuestionId.get(question.id);

    if (!answer) {
      throw new EnergyCalculationError(`Missing answer for question ${question.id}`);
    }

    const weight = question.weight > 0 ? question.weight : 0;
    const effectiveScore = calculateEffectiveScore(answer.rawValue, question);
    weightedSum += effectiveScore * weight;
    totalWeight += weight;
  }

  if (totalWeight <= 0) {
    throw new EnergyCalculationError('Energy test weights must be greater than 0');
  }

  const score = roundEnergyScore(weightedSum / totalWeight);
  return clampEnergyValue(score, 0, 10);
}

export function getEnergyLevel(score: number): EnergyLevel {
  const normalized = clampEnergyValue(roundEnergyScore(score), 0, 10);

  if (normalized <= 2) {
    return 'VERY_LOW';
  }

  if (normalized <= 4) {
    return 'LOW';
  }

  if (normalized <= 6) {
    return 'MEDIUM';
  }

  if (normalized <= 8) {
    return 'GOOD';
  }

  return 'HIGH';
}

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildEnergyCheckIn(params: {
  userId: string;
  testVersion: EnergyTestSnapshot;
  answers: EnergyAnswerInput[];
  createdAt?: string;
  id?: string;
}): EnergyCheckIn {
  const checkInId = params.id ?? createId();
  const score = calculateEnergyScore(params.answers, params.testVersion.questions);
  const answersByQuestionId = new Map(params.answers.map((answer) => [answer.questionId, answer]));

  const answers: EnergyCheckInAnswer[] = params.testVersion.questions.map((question) => {
    const answer = answersByQuestionId.get(question.id);

    if (!answer) {
      throw new EnergyCalculationError(`Missing answer for question ${question.id}`);
    }

    return {
      id: createId(),
      checkInId,
      questionId: question.id,
      questionKey: question.key,
      questionVersion: question.version,
      rawValue: clampEnergyValue(answer.rawValue, question.minValue, question.maxValue),
      effectiveValue: calculateEffectiveScore(answer.rawValue, question),
      weight: question.weight,
    };
  });

  return {
    id: checkInId,
    userId: params.userId,
    testVersionId: params.testVersion.id,
    score,
    createdAt: params.createdAt ?? new Date().toISOString(),
    answers,
  };
}
