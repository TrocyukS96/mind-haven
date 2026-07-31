import { VoiceError } from '@/shared/lib/voice/types';

export interface VoiceTranscribeRequest {
  audio: Blob;
  locale?: string;
}

export interface VoiceTranscribeResult {
  transcript: string;
}

export async function transcribeVoiceRecording({
  audio,
  locale,
}: VoiceTranscribeRequest): Promise<VoiceTranscribeResult> {
  const formData = new FormData();
  formData.append('audio', audio, 'recording.webm');
  if (locale) {
    formData.append('locale', locale);
  }

  let response: Response;

  try {
    response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new VoiceError('NETWORK_ERROR', 'Network error while transcribing voice input');
  }

  const payload = (await response.json()) as {
    transcript?: string;
    error?: string;
    code?: string;
  };

  if (!response.ok) {
    const code =
      response.status === 401
        ? 'UNAUTHORIZED'
        : ((payload.code as VoiceError['code']) ?? 'AI_ERROR');
    throw new VoiceError(code, payload.error ?? 'Failed to transcribe voice input');
  }

  if (!payload.transcript?.trim()) {
    throw new VoiceError('NO_RECORDING', 'No speech detected in the recording');
  }

  return {
    transcript: payload.transcript.trim(),
  };
}
