export const ENERGY_LEVELS = ['VERY_LOW', 'LOW', 'MEDIUM', 'GOOD', 'HIGH'] as const;

export type EnergyLevel = (typeof ENERGY_LEVELS)[number];

export const ENERGY_QUESTION_KEYS = [
  'physical_energy',
  'mental_clarity',
  'readiness_to_act',
  'inner_tension',
  'near_term_readiness',
] as const;

export type EnergyQuestionKey = (typeof ENERGY_QUESTION_KEYS)[number];

export interface EnergyQuestionDefinition {
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
}

export interface EnergyTestQuestion extends EnergyQuestionDefinition {
  sortOrder: number;
  weight: number;
}

export interface EnergyTestSnapshot {
  id: string;
  version: number;
  name: string;
  isActive: boolean;
  questions: EnergyTestQuestion[];
}

export interface EnergyAnswerInput {
  questionId: string;
  rawValue: number;
}

export interface EnergyCheckInAnswer {
  id: string;
  checkInId: string;
  questionId: string;
  questionKey: string;
  questionVersion: number;
  rawValue: number;
  effectiveValue: number;
  weight: number;
}

export interface EnergyCheckIn {
  id: string;
  userId: string;
  testVersionId: string;
  score: number;
  createdAt: string;
  answers: EnergyCheckInAnswer[];
}

export interface EnergyPeriodRange {
  from: string;
  to: string;
}

export interface EnergyPeriodStats {
  latest: EnergyCheckIn | null;
  latestCreatedAt: string | null;
  checkIns: EnergyCheckIn[];
  average: number | null;
  min: number | null;
  max: number | null;
  previousAverage: number | null;
  change: number | null;
}
