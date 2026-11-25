import { describe, expect, it } from 'vitest';
import { getGoalStatus } from './goal-heplers';

const today = new Date(2026, 10, 25);

describe('getGoalStatus', () => {
  it('keeps a far deadline on track even when progress is low', () => {
    expect(getGoalStatus(20, new Date(2027, 2, 1), today)).toBe('on-track');
    expect(getGoalStatus(20, new Date(2027, 11, 31), today)).toBe('on-track');
    expect(getGoalStatus(20, new Date(2031, 11, 31), today)).toBe('on-track');
  });

  it('marks a near or missed deadline as at risk when the goal is unfinished', () => {
    expect(getGoalStatus(20, new Date(2026, 11, 5), today)).toBe('at-risk');
    expect(getGoalStatus(0, new Date(2026, 11, 5), today)).toBe('at-risk');
    expect(getGoalStatus(40, new Date(2026, 10, 20), today)).toBe('at-risk');
    expect(getGoalStatus(90, new Date(2026, 10, 20), today)).toBe('at-risk');
  });

  it('stays on track near the deadline once progress is high enough', () => {
    expect(getGoalStatus(80, new Date(2026, 11, 5), today)).toBe('on-track');
  });

  it('leaves a distant goal with no progress as not started', () => {
    expect(getGoalStatus(0, new Date(2031, 11, 31), today)).toBe('not-started');
  });

  it('treats full progress as completed regardless of the deadline', () => {
    expect(getGoalStatus(100, new Date(2026, 10, 20), today)).toBe('completed');
  });

  it('falls back to progress when the deadline is missing', () => {
    expect(getGoalStatus(0, null, today)).toBe('not-started');
    expect(getGoalStatus(20, null, today)).toBe('at-risk');
    expect(getGoalStatus(70, null, today)).toBe('on-track');
  });
});
