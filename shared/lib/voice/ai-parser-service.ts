import 'server-only';

import { getParserConfig, type ParserContext } from './parsers';
import type { VoiceEntityType } from './types';
import { VoiceError } from './types';
import {
  getYandexAuthHeaders,
  getYandexGptModelUri,
  YANDEX_GPT_COMPLETION_URL,
} from './yandex-client';
import { assertYandexOk, mapYandexError } from './yandex-error';
import { parseModelJson } from './parse-model-json';
import { logVoiceDebug } from './log-voice-debug';
import {
  extractYandexCompletionText,
  type YandexGptCompletionResponse,
} from './yandex-gpt-response';

export interface ParseSpeechOptions {
  transcript: string;
  entityType: VoiceEntityType;
  locale?: string;
  now?: Date;
  goals?: ParserContext['goals'];
}

export async function parseSpeechToStructuredData<TParsed = unknown>({
  transcript,
  entityType,
  locale = 'en',
  now = new Date(),
  goals,
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

    userMessageParts.push(`Transcript: ${transcript}`);

    const userMessage = userMessageParts.join('\n');

    const response = await fetch(YANDEX_GPT_COMPLETION_URL, {
      method: 'POST',
      headers: {
        ...getYandexAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        modelUri: getYandexGptModelUri(),
        completionOptions: {
          stream: false,
          temperature: 0.2,
          maxTokens: 2000,
        },
        messages: [
          { role: 'system', text: systemPrompt },
          { role: 'user', text: userMessage },
        ],
      }),
    });

    await assertYandexOk(response);

    const payload = (await response.json()) as YandexGptCompletionResponse;
    const content = extractYandexCompletionText(payload);

    logVoiceDebug('yandex-gpt-raw', payload);
    logVoiceDebug('yandex-gpt-text', content);

    let raw: unknown;
    try {
      raw = parseModelJson(content);
    } catch {
      logVoiceDebug('yandex-gpt-parse-failed', content);
      throw new VoiceError('PARSE_ERROR', 'AI returned invalid JSON');
    }

    logVoiceDebug('yandex-gpt-parsed', raw);

    try {
      const normalized = normalize(raw, { goals }) as TParsed;
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
