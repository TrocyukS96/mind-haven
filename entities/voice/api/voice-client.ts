import type { VoiceEntityType, VoiceGoalOption, VoiceProcessResult, VoiceTagOption, VoiceAccountOption } from '@/shared/lib/voice/types';
import { VoiceError } from '@/shared/lib/voice/types';

export type { VoiceEntityType, VoiceProcessResult };

export interface VoiceProcessRequest {
  audio: Blob;
  entityType: VoiceEntityType;
  locale?: string;
  goals?: VoiceGoalOption[];
  tags?: VoiceTagOption[];
  accounts?: VoiceAccountOption[];
}

export async function processVoiceInput<TParsed = unknown>({
  audio,
  entityType,
  locale,
  goals,
  tags,
  accounts,
}: VoiceProcessRequest): Promise<VoiceProcessResult<TParsed>> {
  const formData = new FormData();
  formData.append('audio', audio, 'recording.webm');
  formData.append('entityType', entityType);
  if (locale) {
    formData.append('locale', locale);
  }
  if (goals?.length) {
    formData.append('goals', JSON.stringify(goals));
  }
  if (tags?.length) {
    formData.append('tags', JSON.stringify(tags));
  }
  if (accounts?.length) {
    formData.append('accounts', JSON.stringify(accounts));
  }

  let response: Response;

  try {
    response = await fetch('/api/voice/process', {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new VoiceError('NETWORK_ERROR', 'Network error while processing voice input');
  }

  const payload = (await response.json()) as {
    transcript?: string;
    parsed?: TParsed;
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    const code =
      response.status === 401
        ? 'UNAUTHORIZED'
        : ((payload.code as VoiceError['code']) ?? 'AI_ERROR');
    throw new VoiceError(code, payload.error ?? 'Failed to process voice input');
  }

  if (!payload.transcript || !payload.parsed) {
    throw new VoiceError('INVALID_RESPONSE', 'Server returned an incomplete response');
  }

  return {
    transcript: payload.transcript,
    parsed: payload.parsed,
  };
}
