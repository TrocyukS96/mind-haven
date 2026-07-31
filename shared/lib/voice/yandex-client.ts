import 'server-only';

function readEnv(name: string): string {
  const raw = process.env[name]?.trim();

  if (!raw) {
    throw new Error(`${name} is not configured`);
  }

  return raw.replace(/^['"]|['"]$/g, '');
}

function readOptionalEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) {
    return undefined;
  }

  return raw.replace(/^['"]|['"]$/g, '');
}

export function getYandexApiKey(): string | undefined {
  return readOptionalEnv('YANDEX_API_KEY');
}

export function getYandexIamToken(): string | undefined {
  return readOptionalEnv('YANDEX_IAM_TOKEN');
}

export function getYandexFolderId(): string {
  return readEnv('YANDEX_FOLDER_ID');
}

export function getYandexGptModel(): string {
  return readOptionalEnv('YANDEX_GPT_MODEL') ?? 'yandexgpt-lite';
}

export function getYandexGptModelUri(): string {
  return `gpt://${getYandexFolderId()}/${getYandexGptModel()}/latest`;
}

export function assertYandexVoiceConfig(): void {
  if (!getYandexApiKey() && !getYandexIamToken()) {
    throw new Error('YANDEX_API_KEY or YANDEX_IAM_TOKEN is not configured');
  }

  getYandexFolderId();
}

export function getYandexAuthHeaders(): Record<string, string> {
  assertYandexVoiceConfig();

  const apiKey = getYandexApiKey();
  const iamToken = getYandexIamToken();
  const folderId = getYandexFolderId();

  const headers: Record<string, string> = {
    'x-folder-id': folderId,
  };

  if (apiKey) {
    headers.Authorization = `Api-Key ${apiKey}`;
    return headers;
  }

  if (iamToken) {
    headers.Authorization = `Bearer ${iamToken}`;
    return headers;
  }

  throw new Error('YANDEX_API_KEY or YANDEX_IAM_TOKEN is not configured');
}

export function getYandexSttLanguage(locale?: string): string {
  if (locale?.startsWith('ru')) {
    return 'ru-RU';
  }

  if (locale?.startsWith('en')) {
    return 'en-US';
  }

  return 'ru-RU';
}

export const YANDEX_STT_URL = 'https://stt.api.cloud.yandex.net/speech/v1/stt:recognize';
export const YANDEX_GPT_COMPLETION_URL =
  'https://llm.api.cloud.yandex.net/foundationModels/v1/completion';
