'use client';

const VOICE_DEBUG = process.env.NODE_ENV === 'development';

export function logVoiceDebug(stage: string, data: unknown): void {
  if (!VOICE_DEBUG) {
    return;
  }

  console.log(`[voice:${stage}]`, data);
}
