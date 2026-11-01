import { describe, expect, it } from 'vitest';
import { getTreeStage } from './tree-stage';

describe('getTreeStage', () => {
  it('maps progress to growth stages', () => {
    expect(getTreeStage(0)).toBe('seed');
    expect(getTreeStage(1)).toBe('sprout');
    expect(getTreeStage(20)).toBe('sprout');
    expect(getTreeStage(21)).toBe('sapling');
    expect(getTreeStage(40)).toBe('sapling');
    expect(getTreeStage(41)).toBe('young');
    expect(getTreeStage(60)).toBe('young');
    expect(getTreeStage(61)).toBe('adult');
    expect(getTreeStage(80)).toBe('adult');
    expect(getTreeStage(81)).toBe('mature');
    expect(getTreeStage(99)).toBe('mature');
    expect(getTreeStage(100)).toBe('fruit');
  });

  it('clamps values outside 0–100', () => {
    expect(getTreeStage(-4)).toBe('seed');
    expect(getTreeStage(140)).toBe('fruit');
    expect(getTreeStage(Number.NaN)).toBe('seed');
  });
});
