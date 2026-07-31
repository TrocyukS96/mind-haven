import type { VoiceEntityType, VoiceGoalOption, VoiceTagOption } from '../types';
import {
  normalizeParsedGoal,
  GOAL_PARSER_SYSTEM_PROMPT,
  type ParsedGoalVoiceResult,
} from './goal-parser';
import {
  normalizeParsedJournal,
  JOURNAL_PARSER_SYSTEM_PROMPT,
  type ParsedJournalVoiceResult,
} from './journal-parser';
import {
  normalizeParsedHabit,
  HABIT_PARSER_SYSTEM_PROMPT,
  type ParsedHabitVoiceResult,
} from './habit-parser';
import {
  normalizeParsedTask,
  TASK_PARSER_SYSTEM_PROMPT,
  type ParsedTaskVoiceResult,
} from './task-parser';

export type ParsedVoiceResultMap = {
  task: ParsedTaskVoiceResult;
  goal: ParsedGoalVoiceResult;
  journal: ParsedJournalVoiceResult;
  habit: ParsedHabitVoiceResult;
  reflection: Record<string, unknown>;
  note: Record<string, unknown>;
};

export interface ParserContext {
  goals?: VoiceGoalOption[];
  tags?: VoiceTagOption[];
}

interface EntityParserConfig {
  systemPrompt: string;
  normalize: (raw: unknown, context?: ParserContext) => unknown;
}

const PARSER_REGISTRY: Partial<Record<VoiceEntityType, EntityParserConfig>> = {
  task: {
    systemPrompt: TASK_PARSER_SYSTEM_PROMPT,
    normalize: (raw, context) => normalizeParsedTask(raw, context?.goals ?? []),
  },
  goal: {
    systemPrompt: GOAL_PARSER_SYSTEM_PROMPT,
    normalize: (raw) => normalizeParsedGoal(raw),
  },
  journal: {
    systemPrompt: JOURNAL_PARSER_SYSTEM_PROMPT,
    normalize: (raw, context) => normalizeParsedJournal(raw, context?.tags ?? []),
  },
  habit: {
    systemPrompt: HABIT_PARSER_SYSTEM_PROMPT,
    normalize: (raw) => normalizeParsedHabit(raw),
  },
};

export function getParserConfig(entityType: VoiceEntityType): EntityParserConfig {
  const config = PARSER_REGISTRY[entityType];

  if (!config) {
    throw new Error(`Voice parser for "${entityType}" is not implemented yet`);
  }

  return config;
}

export function isVoiceEntitySupported(entityType: VoiceEntityType): boolean {
  return entityType in PARSER_REGISTRY;
}

export { normalizeParsedTask, TASK_PARSER_SYSTEM_PROMPT };
export type { ParsedTaskVoiceResult };
export { normalizeParsedGoal, GOAL_PARSER_SYSTEM_PROMPT };
export type { ParsedGoalVoiceResult };
export { normalizeParsedJournal, JOURNAL_PARSER_SYSTEM_PROMPT };
export type { ParsedJournalVoiceResult };
export { normalizeParsedHabit, HABIT_PARSER_SYSTEM_PROMPT };
export type { ParsedHabitVoiceResult };
export { resolveTaskGoalId } from './resolve-task-goal';
export { resolveJournalTagId } from './resolve-journal-tag';
