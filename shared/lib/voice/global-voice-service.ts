import 'server-only';

import { parseSpeechToStructuredData } from './ai-parser-service';
import {
  classifyVoiceEntityType,
} from './intent-classifier';
import type { GlobalVoiceEntityType } from './types';
import type { ParserContext } from './parsers';
import { isVoiceEntitySupported } from './parsers';

export interface ParseGlobalVoiceCommandOptions {
  transcript: string;
  locale?: string;
  now?: Date;
  goals?: ParserContext['goals'];
  tags?: ParserContext['tags'];
}

export interface GlobalVoiceCommandResult {
  entityType: GlobalVoiceEntityType;
  transcript: string;
  parsed: unknown;
}

export async function parseGlobalVoiceCommand({
  transcript,
  locale = 'en',
  now = new Date(),
  goals,
  tags,
}: ParseGlobalVoiceCommandOptions): Promise<GlobalVoiceCommandResult> {
  const entityType = await classifyVoiceEntityType(transcript, locale);

  if (!isVoiceEntitySupported(entityType)) {
    throw new Error(`Voice parser for "${entityType}" is not implemented yet`);
  }

  const parsed = await parseSpeechToStructuredData({
    transcript,
    entityType,
    locale,
    now,
    goals,
    tags,
  });

  return {
    entityType,
    transcript,
    parsed,
  };
}
