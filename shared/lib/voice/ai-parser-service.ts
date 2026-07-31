import 'server-only';

import { getParserConfig, type ParserContext } from './parsers';
import type { VoiceEntityType } from './types';
import { VoiceError } from './types';
import { logVoiceDebug } from './log-voice-debug';
import { mapYandexError } from './yandex-error';
import { requestYandexGptJson } from './yandex-gpt-complete';

export interface ParseSpeechOptions {
  transcript: string;
  entityType: VoiceEntityType;
  locale?: string;
  now?: Date;
  goals?: ParserContext['goals'];
  tags?: ParserContext['tags'];
  accounts?: ParserContext['accounts'];
}

export async function parseSpeechToStructuredData<TParsed = unknown>({
  transcript,
  entityType,
  locale = 'en',
  now = new Date(),
  goals,
  tags,
  accounts,
}: ParseSpeechOptions): Promise<TParsed> {
  try {
    const { systemPrompt, normalize } = getParserConfig(entityType);

    const userMessageParts = [
      `Locale: ${locale}`,
      `Current datetime (ISO): ${now.toISOString()}`,
    ];

    if (goals?.length) {
      userMessageParts.push(
        'Available goals:',
        ...goals.map((goal) => `- id: "${goal.id}", title: "${goal.title}"`)
      );
    }

    if (tags?.length) {
      userMessageParts.push(
        'Available tags:',
        ...tags.map((tag) => `- id: "${tag.id}", name: "${tag.name}"`)
      );
    }

    if (accounts?.length) {
      userMessageParts.push(
        'Available accounts:',
        ...accounts.map(
          (account) =>
            `- id: "${account.id}", name: "${account.name}", currency: "${account.currency}"`
        )
      );
    }

    userMessageParts.push(`Transcript: ${transcript}`);

    const raw = await requestYandexGptJson(systemPrompt, userMessageParts.join('\n'));

    try {
      const normalized = normalize(raw, { goals, tags, accounts }) as TParsed;
      logVoiceDebug('yandex-gpt-normalized', normalized);
      return normalized;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to normalize AI response';
      throw new VoiceError('PARSE_ERROR', message);
    }
  } catch (error) {
    if (error instanceof VoiceError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Failed to parse speech';

    if (message.includes('not implemented')) {
      throw new VoiceError('PARSE_ERROR', message);
    }

    throw mapYandexError(error, 'Failed to parse speech');
  }
}
