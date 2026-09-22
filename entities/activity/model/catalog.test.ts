import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_TYPE_DEFINITIONS,
  getActivityFilterCategories,
  getActivityTypesForCategory,
} from './catalog';

describe('activity catalog', () => {
  it('derives filter categories from registered types', () => {
    const categories = getActivityFilterCategories();

    expect(categories).toEqual([
      'TASK',
      'GOAL',
      'HABIT',
      'JOURNAL',
      'ENERGY',
      'REFLECTION',
      'DECISION',
    ]);
  });

  it('includes new types in an existing category without UI changes', () => {
    expect(getActivityTypesForCategory('TASK')).toEqual(
      ACTIVITY_TYPE_DEFINITIONS.filter((item) => item.category === 'TASK').map((item) => item.type)
    );
  });
});
