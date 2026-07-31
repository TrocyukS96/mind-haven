import { VoiceError } from './types';

interface YandexGptMessage {
  role: string;
  text?: string;
}

export interface YandexGptCompletionResponse {
  result?: {
    alternatives?: Array<{
      message?: YandexGptMessage;
      status?: string;
    }>;
  };
}

export function extractYandexCompletionText(payload: YandexGptCompletionResponse): string {
  const alternatives = payload.result?.alternatives ?? [];
  const finalAlternative =
    alternatives.find((item) => item.status === 'ALTERNATIVE_STATUS_FINAL') ?? alternatives[0];
  const text = finalAlternative?.message?.text?.trim();

  if (!text) {
    throw new VoiceError('INVALID_RESPONSE', 'AI returned an empty response');
  }

  return text;
}
