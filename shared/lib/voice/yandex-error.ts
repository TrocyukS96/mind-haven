import 'server-only';

import { VoiceError } from './types';

interface YandexApiErrorPayload {
  error?: {
    message?: string;
    code?: number;
    grpcCode?: number;
  };
  message?: string;
}

export function mapYandexError(error: unknown, fallbackMessage: string): VoiceError {
  if (error instanceof VoiceError) {
    return error;
  }

  if (error instanceof YandexApiError) {
    if (error.status === 401 || error.status === 403) {
      return new VoiceError('CONFIG_ERROR', 'Yandex Cloud credentials are invalid');
    }

    if (error.status === 429 || error.code === 'QUOTA_EXCEEDED') {
      return new VoiceError(
        'AI_QUOTA_EXHAUSTED',
        'Yandex Cloud quota is exhausted. Check billing in Yandex Cloud Console.'
      );
    }

    return new VoiceError('AI_ERROR', error.message || fallbackMessage);
  }

  const message = error instanceof Error ? error.message : fallbackMessage;

  if (
    message.includes('YANDEX_API_KEY') ||
    message.includes('YANDEX_IAM_TOKEN') ||
    message.includes('YANDEX_FOLDER_ID')
  ) {
    return new VoiceError('CONFIG_ERROR', 'Voice input is not configured on the server');
  }

  if (message.includes('quota') || message.includes('billing')) {
    return new VoiceError(
      'AI_QUOTA_EXHAUSTED',
      'Yandex Cloud quota is exhausted. Check billing in Yandex Cloud Console.'
    );
  }

  return new VoiceError('AI_ERROR', message);
}

export class YandexApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'YandexApiError';
    this.status = status;
    this.code = code;
  }
}

export async function readYandexError(response: Response): Promise<YandexApiError> {
  let message = `Yandex API request failed with status ${response.status}`;
  let code: string | undefined;

  try {
    const payload = (await response.json()) as YandexApiErrorPayload;
    message = payload.error?.message ?? payload.message ?? message;
    code = payload.error?.code?.toString();
  } catch {
    try {
      const text = await response.text();
      if (text.trim()) {
        message = text.trim();
      }
    } catch {
      // ignore secondary read errors
    }
  }

  return new YandexApiError(response.status, message, code);
}

export async function assertYandexOk(response: Response): Promise<void> {
  if (response.ok) {
    return;
  }

  throw await readYandexError(response);
}
