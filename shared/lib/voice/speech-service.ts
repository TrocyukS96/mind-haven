import 'server-only';

import { prepareSpeechAudio } from './audio-converter';
import { VoiceError } from './types';
import {
  getYandexApiKey,
  getYandexAuthHeaders,
  getYandexFolderId,
  getYandexSttLanguage,
  YANDEX_STT_URL,
} from './yandex-client';
import { assertYandexOk, mapYandexError } from './yandex-error';
import { logVoiceDebug } from './log-voice-debug';

export interface TranscribeOptions {
  audio: Buffer | Blob;
  filename?: string;
  language?: string;
  mimeType?: string;
}

interface YandexSttResponse {
  result?: string;
}

export async function transcribeSpeech({
  audio,
  language,
  mimeType,
}: TranscribeOptions): Promise<string> {
  try {
    const prepared = await prepareSpeechAudio(audio, mimeType);
    const authHeaders = getYandexAuthHeaders();

    const params = new URLSearchParams({
      lang: getYandexSttLanguage(language),
      topic: 'general',
    });

    if (!getYandexApiKey()) {
      params.set('folderId', getYandexFolderId());
    }

    if (prepared.format === 'oggopus') {
      params.set('format', 'oggopus');
    } else {
      params.set('format', 'lpcm');
      params.set('sampleRateHertz', String(prepared.sampleRateHertz ?? 16000));
    }

    const response = await fetch(`${YANDEX_STT_URL}?${params.toString()}`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/octet-stream',
      },
      body: new Uint8Array(prepared.data),
    });

    await assertYandexOk(response);

    const payload = (await response.json()) as YandexSttResponse;
    const text = payload.result?.trim();

    if (!text) {
      throw new VoiceError('NO_RECORDING', 'No speech detected in the recording');
    }

    logVoiceDebug('speechkit-transcript', text);

    return text;
  } catch (error) {
    if (error instanceof VoiceError) {
      throw error;
    }

    throw mapYandexError(error, 'Speech transcription failed');
  }
}
