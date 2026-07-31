export type VoiceRecorderStatus = 'idle' | 'recording' | 'processing' | 'error';

export type { VoiceEntityType } from '@/entities/voice';

export const MIN_RECORDING_MS = 800;

export const VOICE_MIME_TYPES = [
  'audio/ogg;codecs=opus',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
] as const;

export function formatRecordingDuration(durationMs: number): string {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') {
    return undefined;
  }

  return VOICE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}
