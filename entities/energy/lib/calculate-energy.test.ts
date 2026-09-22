import { describe, expect, it } from 'vitest';
import { getDefaultEnergyTestSnapshot } from '@/shared/config/energy-test';
import {
  buildEnergyCheckIn,
  calculateEffectiveScore,
  calculateEnergyScore,
  getEnergyLevel,
} from './calculate-energy';
import { assertEnergyQuestionCanBeDeleted, EnergyQuestionInUseError } from './question-guard';

const v1 = getDefaultEnergyTestSnapshot();
const questionByKey = Object.fromEntries(v1.questions.map((question) => [question.key, question]));

function answersFor(rawByKey: Record<string, number>) {
  return v1.questions.map((question) => ({
    questionId: question.id,
    rawValue: rawByKey[question.key],
  }));
}

describe('calculateEffectiveScore', () => {
  it('keeps raw values for regular questions', () => {
    expect(calculateEffectiveScore(7, questionByKey.physical_energy)).toBe(7);
  });

  it('reverses inner tension', () => {
    expect(calculateEffectiveScore(0, questionByKey.inner_tension)).toBe(10);
    expect(calculateEffectiveScore(5, questionByKey.inner_tension)).toBe(5);
    expect(calculateEffectiveScore(10, questionByKey.inner_tension)).toBe(0);
  });
});

describe('calculateEnergyScore', () => {
  it('scores all zeros as 2.0 because Q4 is reverse-scored', () => {
    expect(calculateEnergyScore(answersFor({
      physical_energy: 0,
      mental_clarity: 0,
      readiness_to_act: 0,
      inner_tension: 0,
      near_term_readiness: 0,
    }), v1.questions)).toBe(2);
  });

  it('scores all tens as 8.0 because Q4 is reverse-scored', () => {
    expect(calculateEnergyScore(answersFor({
      physical_energy: 10,
      mental_clarity: 10,
      readiness_to_act: 10,
      inner_tension: 10,
      near_term_readiness: 10,
    }), v1.questions)).toBe(8);
  });

  it('scores mid values as 5.0', () => {
    expect(calculateEnergyScore(answersFor({
      physical_energy: 5,
      mental_clarity: 5,
      readiness_to_act: 5,
      inner_tension: 5,
      near_term_readiness: 5,
    }), v1.questions)).toBe(5);
  });

  it('applies reverse scoring only to Q4', () => {
    expect(calculateEnergyScore(answersFor({
      physical_energy: 10,
      mental_clarity: 10,
      readiness_to_act: 10,
      inner_tension: 0,
      near_term_readiness: 10,
    }), v1.questions)).toBe(10);

    expect(calculateEnergyScore(answersFor({
      physical_energy: 0,
      mental_clarity: 0,
      readiness_to_act: 0,
      inner_tension: 10,
      near_term_readiness: 0,
    }), v1.questions)).toBe(0);
  });

  it('rounds to one decimal place', () => {
    expect(calculateEnergyScore(answersFor({
      physical_energy: 1,
      mental_clarity: 2,
      readiness_to_act: 3,
      inner_tension: 4,
      near_term_readiness: 5,
    }), v1.questions)).toBe(3.4);
  });

  it('never goes outside 0-10', () => {
    const score = calculateEnergyScore(answersFor({
      physical_energy: -20,
      mental_clarity: 99,
      readiness_to_act: 15,
      inner_tension: -3,
      near_term_readiness: 8,
    }), v1.questions);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(10);
  });
});

describe('getEnergyLevel', () => {
  it('maps score ranges to descriptive levels', () => {
    expect(getEnergyLevel(0)).toBe('VERY_LOW');
    expect(getEnergyLevel(2)).toBe('VERY_LOW');
    expect(getEnergyLevel(2.1)).toBe('LOW');
    expect(getEnergyLevel(4)).toBe('LOW');
    expect(getEnergyLevel(4.1)).toBe('MEDIUM');
    expect(getEnergyLevel(6)).toBe('MEDIUM');
    expect(getEnergyLevel(6.1)).toBe('GOOD');
    expect(getEnergyLevel(8)).toBe('GOOD');
    expect(getEnergyLevel(8.1)).toBe('HIGH');
    expect(getEnergyLevel(10)).toBe('HIGH');
  });
});

describe('energy test versions', () => {
  it('does not mix questions from different versions when scoring', () => {
    const v2Questions = v1.questions.map((question) =>
      question.key === 'inner_tension'
        ? { ...question, reverseScoring: false, weight: 2 }
        : question
    );

    const raw = answersFor({
      physical_energy: 10,
      mental_clarity: 10,
      readiness_to_act: 10,
      inner_tension: 0,
      near_term_readiness: 10,
    });

    expect(calculateEnergyScore(raw, v1.questions)).toBe(10);
    expect(calculateEnergyScore(raw, v2Questions)).toBe(6.7);
  });

  it('keeps an existing check-in unchanged when the active version changes', () => {
    const stored = buildEnergyCheckIn({
      userId: 'user-1',
      testVersion: v1,
      answers: answersFor({
        physical_energy: 8,
        mental_clarity: 7,
        readiness_to_act: 6,
        inner_tension: 3,
        near_term_readiness: 8,
      }),
      createdAt: '2026-01-01T10:00:00.000Z',
    });

    const laterActiveVersion = {
      ...v1,
      id: 'energy-test-v2',
      version: 2,
      questions: v1.questions.map((question) =>
        question.key === 'inner_tension'
          ? { ...question, reverseScoring: false }
          : question
      ),
    };

    const laterScore = calculateEnergyScore(
      stored.answers.map((answer) => ({
        questionId: answer.questionId,
        rawValue: answer.rawValue,
      })),
      laterActiveVersion.questions
    );

    expect(stored.testVersionId).toBe(v1.id);
    expect(stored.score).not.toBe(laterScore);
    expect(stored.score).toBe(7.2);
  });

  it('does not allow deleting a question used by historical results', () => {
    expect(() => assertEnergyQuestionCanBeDeleted(1)).toThrow(EnergyQuestionInUseError);
    expect(() => assertEnergyQuestionCanBeDeleted(0)).not.toThrow();
  });
});
