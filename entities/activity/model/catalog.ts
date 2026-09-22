import {
  ACTIVITY_CATEGORIES,
  ACTIVITY_TYPES,
  type ActivityCategory,
  type ActivityType,
} from './types';

export interface ActivityTypeDefinition {
  type: ActivityType;
  category: ActivityCategory;
  entityType: ActivityCategory;
}

export const ACTIVITY_TYPE_DEFINITIONS: readonly ActivityTypeDefinition[] = [
  { type: 'TASK_CREATED', category: 'TASK', entityType: 'TASK' },
  { type: 'TASK_COMPLETED', category: 'TASK', entityType: 'TASK' },
  { type: 'TASK_OVERDUE', category: 'TASK', entityType: 'TASK' },
  { type: 'GOAL_CREATED', category: 'GOAL', entityType: 'GOAL' },
  { type: 'GOAL_COMPLETED', category: 'GOAL', entityType: 'GOAL' },
  { type: 'GOAL_STATUS_CHANGED', category: 'GOAL', entityType: 'GOAL' },
  { type: 'HABIT_CREATED', category: 'HABIT', entityType: 'HABIT' },
  { type: 'HABIT_COMPLETED', category: 'HABIT', entityType: 'HABIT' },
  { type: 'JOURNAL_ENTRY_CREATED', category: 'JOURNAL', entityType: 'JOURNAL' },
  { type: 'JOURNAL_ENTRY_UPDATED', category: 'JOURNAL', entityType: 'JOURNAL' },
  { type: 'ENERGY_CHECK_IN_COMPLETED', category: 'ENERGY', entityType: 'ENERGY' },
  { type: 'REFLECTION_CREATED', category: 'REFLECTION', entityType: 'REFLECTION' },
  { type: 'DECISION_CREATED', category: 'DECISION', entityType: 'DECISION' },
  { type: 'DECISION_UPDATED', category: 'DECISION', entityType: 'DECISION' },
] as const;

const DEFINITIONS_BY_TYPE = new Map(
  ACTIVITY_TYPE_DEFINITIONS.map((definition) => [definition.type, definition])
);

export function isActivityType(value: string): value is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(value);
}

export function getActivityTypeDefinition(type: string): ActivityTypeDefinition | undefined {
  return isActivityType(type) ? DEFINITIONS_BY_TYPE.get(type) : undefined;
}

export function getActivityCategory(type: string): ActivityCategory | undefined {
  return getActivityTypeDefinition(type)?.category;
}

export function getActivityFilterCategories(): ActivityCategory[] {
  const seen = new Set<ActivityCategory>();
  const categories: ActivityCategory[] = [];

  for (const definition of ACTIVITY_TYPE_DEFINITIONS) {
    if (seen.has(definition.category)) continue;
    seen.add(definition.category);
    categories.push(definition.category);
  }

  return categories.length > 0 ? categories : [...ACTIVITY_CATEGORIES];
}

export function getActivityTypesForCategory(category: ActivityCategory): ActivityType[] {
  return ACTIVITY_TYPE_DEFINITIONS.filter((definition) => definition.category === category).map(
    (definition) => definition.type
  );
}
