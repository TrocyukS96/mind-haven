import type { VoiceEntityType, VoiceGoalOption } from '../types';
import {
  normalizeParsedTask,
  TASK_PARSER_SYSTEM_PROMPT,
  type ParsedTaskVoiceResult,
} from './task-parser';

export type ParsedVoiceResultMap = {
  task: ParsedTaskVoiceResult;
  goal: Record<string, unknown>;
  journal: Record<string, unknown>;
  habit: Record<string, unknown>;
  reflection: Record<string, unknown>;
  note: Record<string, unknown>;
};

export interface ParserContext {
  goals?: VoiceGoalOption[];
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
export { resolveTaskGoalId } from './resolve-task-goal';
