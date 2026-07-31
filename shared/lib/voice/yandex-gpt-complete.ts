import 'server-only';

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
import { VoiceError } from './types';

export async function requestYandexGptText(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  try {
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

    return content;
  } catch (error) {
    if (error instanceof VoiceError) {
      throw error;
    }

    throw mapYandexError(error, 'Failed to call Yandex GPT');
  }
}

export async function requestYandexGptJson(
  systemPrompt: string,
  userMessage: string
): Promise<unknown> {
  const content = await requestYandexGptText(systemPrompt, userMessage);

  try {
    const raw = parseModelJson(content);
    logVoiceDebug('yandex-gpt-parsed', raw);
    return raw;
  } catch {
    logVoiceDebug('yandex-gpt-parse-failed', content);
    throw new VoiceError('PARSE_ERROR', 'AI returned invalid JSON');
  }
}
